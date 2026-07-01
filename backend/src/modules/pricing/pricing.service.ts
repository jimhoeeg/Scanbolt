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
import { B2BPriceResult, DealerStatus, PricingTier } from '../../types';

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

/**
 * Fase 3 — forhandlerens tier-status + besparelse (til progressbaren).
 * Beregner årets forbrug og besparelse fra `orders`/`order_items`, finder
 * næste tier ud fra omsætningsgrænserne og hvor langt der er dertil.
 */
export async function getDealerStatus(userId: string): Promise<DealerStatus> {
  const profile = await queryOne<{ tier: PricingTier; base_discount: string; min_spend: string }>(
    `SELECT dp.pricing_tier AS tier, pt.base_discount, pt.min_annual_spend AS min_spend
       FROM dealer_profiles dp
       JOIN pricing_tiers pt ON pt.tier = dp.pricing_tier
      WHERE dp.user_id = $1`,
    [userId],
  );
  const tier = profile?.tier ?? 'bronze';
  const baseDiscount = Number(profile?.base_discount ?? 0);
  const currentThreshold = Number(profile?.min_spend ?? 0);

  // Årets forbrug (grand_total) og besparelse (list − net) fra ordrer.
  const spendRow = await queryOne<{ ytd_spend: string }>(
    `SELECT COALESCE(SUM(grand_total), 0) AS ytd_spend
       FROM orders
      WHERE user_id = $1
        AND status <> 'cancelled'
        AND created_at >= date_trunc('year', now())`,
    [userId],
  );
  const savingsRow = await queryOne<{ ytd_savings: string }>(
    `SELECT COALESCE(SUM((oi.unit_list_price - oi.unit_net_price) * oi.quantity), 0) AS ytd_savings
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = $1
        AND o.status <> 'cancelled'
        AND o.created_at >= date_trunc('year', now())`,
    [userId],
  );
  const ytdSpend = Number(spendRow?.ytd_spend ?? 0);
  const ytdSavings = Number(savingsRow?.ytd_savings ?? 0);

  // Næste tier = laveste grænse der ligger over den nuværende.
  const next = await queryOne<{ tier: PricingTier; min_spend: string }>(
    `SELECT tier, min_annual_spend AS min_spend
       FROM pricing_tiers
      WHERE min_annual_spend > $1
      ORDER BY min_annual_spend ASC
      LIMIT 1`,
    [currentThreshold],
  );

  const nextTier = next?.tier ?? null;
  const nextTierThreshold = next ? Number(next.min_spend) : null;
  const amountToNext = nextTierThreshold != null ? Math.max(0, nextTierThreshold - ytdSpend) : null;
  const progressPct =
    nextTierThreshold != null && nextTierThreshold > currentThreshold
      ? Math.min(100, Math.round(((ytdSpend - currentThreshold) / (nextTierThreshold - currentThreshold)) * 100))
      : 100;

  return {
    tier,
    baseDiscount,
    ytdSpend: round2(ytdSpend),
    ytdSavings: round2(ytdSavings),
    nextTier,
    nextTierThreshold,
    amountToNext: amountToNext != null ? round2(amountToNext) : null,
    progressPct: Math.max(0, progressPct),
  };
}
