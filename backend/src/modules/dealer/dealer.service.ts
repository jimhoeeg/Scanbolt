/**
 * MODULE 3 — Dealer service.
 * Quick order validation, OEM cross-referencing, and CSV bulk resolution.
 * Line pricing is delegated to MODULE 4 (calculateB2BPrice).
 */
import { queryOne } from '../../db/pool';
import { calculateB2BPrice } from '../pricing/pricing.service';
import { ParsedCsvRow } from './csv';

export interface QuickOrderLine {
  sku: string;
  quantity: number;
}

export interface ResolvedLine {
  sku: string;
  title: string;
  quantity: number;
  availableStock: number;
  inStock: boolean;
  listPrice: number;
  netUnitPrice: number;
  discountPct: number;
  lineTotal: number;
  error?: string;
}

interface PartLookupRow {
  id: string;
  sku: string;
  title: string;
  price: string;
  stock_qty: number;
}

/**
 * Resolve + price an array of {sku, quantity} lines for a dealer.
 * Validates stock and computes B2B pricing per line.
 */
export async function resolveQuickOrder(
  userId: string,
  lines: QuickOrderLine[],
): Promise<{ items: ResolvedLine[]; grandTotal: number }> {
  const items: ResolvedLine[] = [];
  let grandTotal = 0;

  for (const line of lines) {
    const part = await queryOne<PartLookupRow>(
      `SELECT id, sku, title, price, stock_qty FROM parts WHERE sku = $1 AND is_active = TRUE`,
      [line.sku],
    );

    if (!part) {
      items.push({
        sku: line.sku,
        title: '—',
        quantity: line.quantity,
        availableStock: 0,
        inStock: false,
        listPrice: 0,
        netUnitPrice: 0,
        discountPct: 0,
        lineTotal: 0,
        error: 'SKU not found',
      });
      continue;
    }

    const listPrice = Number(part.price);
    const pricing = await calculateB2BPrice(userId, part.sku, listPrice, line.quantity);
    const inStock = part.stock_qty >= line.quantity;

    const resolved: ResolvedLine = {
      sku: part.sku,
      title: part.title,
      quantity: line.quantity,
      availableStock: part.stock_qty,
      inStock,
      listPrice: pricing.listPrice,
      netUnitPrice: pricing.netUnitPrice,
      discountPct: pricing.discountPct,
      lineTotal: pricing.lineTotal,
      error: inStock ? undefined : `Only ${part.stock_qty} in stock`,
    };
    items.push(resolved);
    if (inStock) grandTotal += pricing.lineTotal;
  }

  return { items, grandTotal: Math.round(grandTotal * 100) / 100 };
}

export interface OemLookupResult {
  oemNumber: string;
  matched: boolean;
  sku?: string;
  title?: string;
  manufacturer?: string;
  availableStock?: number;
  inStock?: boolean;
}

/**
 * Cross-reference an external OEM number to an internal SKU and return
 * real-time availability. Case-insensitive on the OEM number.
 */
export async function lookupOem(oemNumber: string): Promise<OemLookupResult> {
  const row = await queryOne<{
    sku: string;
    title: string;
    manufacturer: string | null;
    stock_qty: number;
  }>(
    `SELECT p.sku, p.title, om.manufacturer, p.stock_qty
       FROM oem_mappings om
       JOIN parts p ON p.id = om.part_id
      WHERE UPPER(om.oem_number) = UPPER($1)
        AND p.is_active = TRUE
      ORDER BY om.is_primary DESC
      LIMIT 1`,
    [oemNumber],
  );

  if (!row) return { oemNumber, matched: false };

  return {
    oemNumber,
    matched: true,
    sku: row.sku,
    title: row.title,
    manufacturer: row.manufacturer ?? undefined,
    availableStock: row.stock_qty,
    inStock: row.stock_qty > 0,
  };
}

export interface CsvResolvedRow extends ParsedCsvRow {
  sku?: string;
  title?: string;
  availableStock?: number;
  resolved: boolean;
}

/**
 * Turn parsed CSV rows into cart-ready lines: resolve OEM rows to SKUs and
 * confirm every SKU exists. Invalid rows keep their parse error so the UI
 * can highlight them.
 */
export async function resolveCsvRows(rows: ParsedCsvRow[]): Promise<CsvResolvedRow[]> {
  const out: CsvResolvedRow[] = [];

  for (const row of rows) {
    if (!row.valid) {
      out.push({ ...row, resolved: false });
      continue;
    }

    if (row.identifierType === 'oem_number') {
      const lookup = await lookupOem(row.identifier);
      if (!lookup.matched) {
        out.push({ ...row, valid: false, error: 'OEM number not found', resolved: false });
      } else {
        out.push({
          ...row,
          sku: lookup.sku,
          title: lookup.title,
          availableStock: lookup.availableStock,
          resolved: true,
        });
      }
      continue;
    }

    // SKU path
    const part = await queryOne<{ title: string; stock_qty: number }>(
      `SELECT title, stock_qty FROM parts WHERE sku = $1 AND is_active = TRUE`,
      [row.identifier],
    );
    if (!part) {
      out.push({ ...row, valid: false, error: 'SKU not found', resolved: false });
    } else {
      out.push({
        ...row,
        sku: row.identifier,
        title: part.title,
        availableStock: part.stock_qty,
        resolved: true,
      });
    }
  }

  return out;
}

/** Utility for callers that just want the distinct SKUs found in the DB. */
export async function skuExists(sku: string): Promise<boolean> {
  const row = await queryOne('SELECT 1 FROM parts WHERE sku = $1', [sku]);
  return Boolean(row);
}
