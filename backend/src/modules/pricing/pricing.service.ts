/**
 * MODULE 4 — B2B Pricing & ERP Sync simulation.
 *
 * `calculateB2BPrice` resolves the net price a dealer pays for a line item:
 *   1. A negotiated contract price (contract_prices) wins outright.
 *   2. Otherwise: tier base discount (dealer_profiles.pricing_tier)
 *      + the best matching volume price-break (price_breaks) for the qty.
 *
 * `simulateErpSync` stands in for a Microsoft Business Central OData call —
 * in production, swap the body for a real HTTP request; the signature stays.
 */
import { queryOne } from '../../db/pool';
import { B2BPriceResult, PricingTier } from '../../types';

interface DealerPricingContext {
  tier: PricingTier;
  baseDiscount: number;
}

/** Load the dealer's tier + base discount. Falls back to bronze/0 if missing. */
async function getDealerContext(userId: string): Promise<DealerPricingContext> {
  const row = await queryOne<{ tier: PricingTier; base_discount: string }>(
    `SELECT dp.pricing_tier AS tier, pt.base_discount
       FROM dealer_profiles dp
       JOIN pricing_tiers pt ON pt.tier = dp.pricing_tier
      WHERE dp.user_id = $1`,
    [userId],
  );
  if (!row) return { tier: 'bronze', baseDiscount: 0 };
  return { tier: row.tier, baseDiscount: Number(row.base_discount) };
}

/**
 * Find the largest applicable volume discount for (part, tier, quantity).
 * Global breaks (part_id / tier NULL) and specific breaks both count; the
 * one with the highest extra_discount that the quantity qualifies for wins.
 */
async function getVolumeDiscount(
  partId: string,
  tier: PricingTier,
  quantity: number,
): Promise<number> {
  const row = await queryOne<{ extra_discount: string }>(
    `SELECT extra_discount
       FROM price_breaks
      WHERE min_quantity <= $1
        AND (part_id = $2 OR part_id IS NULL)
        AND (tier = $3 OR tier IS NULL)
      ORDER BY extra_discount DESC
      LIMIT 1`,
    [quantity, partId, tier],
  );
  return row ? Number(row.extra_discount) : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the B2B price for a single line.
 *
 * @param userId        Dealer user id (drives tier + contract lookups).
 * @param sku           Internal SKU (used to resolve the part).
 * @param standardPrice List price per unit (already known by the caller).
 * @param quantity      Number of units ordered (drives volume breaks).
 */
export async function calculateB2BPrice(
  userId: string,
  sku: string,
  standardPrice: number,
  quantity: number,
): Promise<B2BPriceResult> {
  const part = await queryOne<{ id: string }>(`SELECT id FROM parts WHERE sku = $1`, [sku]);
  if (!part) {
    throw Object.assign(new Error(`Unknown SKU: ${sku}`), { status: 404 });
  }

  // 1) Contract price short-circuits all tier/volume logic.
  const contract = await queryOne<{ unit_price: string }>(
    `SELECT unit_price
       FROM contract_prices
      WHERE user_id = $1 AND part_id = $2
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)`,
    [userId, part.id],
  );

  if (contract) {
    const netUnitPrice = Number(contract.unit_price);
    const discountPct = standardPrice > 0 ? round2((1 - netUnitPrice / standardPrice) * 100) : 0;
    return {
      sku,
      quantity,
      listPrice: round2(standardPrice),
      netUnitPrice: round2(netUnitPrice),
      discountPct,
      lineTotal: round2(netUnitPrice * quantity),
      source: 'contract',
    };
  }

  // 2) Tier base discount + best volume break.
  const { tier, baseDiscount } = await getDealerContext(userId);
  const volumeDiscount = await getVolumeDiscount(part.id, tier, quantity);

  // Discounts are additive but capped at a sane ceiling (never below cost).
  const totalDiscountPct = Math.min(baseDiscount + volumeDiscount, 60);
  const netUnitPrice = round2(standardPrice * (1 - totalDiscountPct / 100));

  return {
    sku,
    quantity,
    listPrice: round2(standardPrice),
    netUnitPrice,
    discountPct: round2(totalDiscountPct),
    lineTotal: round2(netUnitPrice * quantity),
    source: 'tier+volume',
  };
}

/**
 * Simulate pushing a confirmed order to Microsoft Business Central.
 * Returns an ERP reference id that we persist on the order for invoicing.
 * Replace the body with an OData POST when wiring the real ERP.
 */
export async function simulateErpSync(order: {
  orderId: string;
  erpCustomerId: string | null;
  jobId: string | null;
  grandTotal: number;
}): Promise<{ erpReference: string; syncedAt: string }> {
  if (process.env.ERP_ENABLED === 'true') {
    // Placeholder for a real Business Central call:
    //   await fetch(`${process.env.ERP_BASE_URL}/salesOrders`, { ... })
  }
  // Deterministic-ish fake reference so demos are reproducible.
  const stamp = Date.now().toString(36).toUpperCase();
  const jobPart = order.jobId ? `-${order.jobId}` : '';
  return {
    erpReference: `BC-SO-${stamp}${jobPart}`,
    syncedAt: new Date().toISOString(),
  };
}

/** Resolve the dealer's ERP customer id (for the sync call above). */
export async function getErpCustomerId(userId: string): Promise<string | null> {
  const row = await queryOne<{ erp_customer_id: string | null }>(
    `SELECT erp_customer_id FROM dealer_profiles WHERE user_id = $1`,
    [userId],
  );
  return row?.erp_customer_id ?? null;
}
