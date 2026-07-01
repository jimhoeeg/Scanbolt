/**
 * MODULE 3 — CSV parsing helper for bulk dealer orders.
 * Accepts either `sku,quantity` or `oem_number,quantity` rows and returns a
 * normalized, per-row validation result so the frontend can highlight the
 * exact offending lines.
 */
import { parse } from 'csv-parse/sync';

export interface ParsedCsvRow {
  line: number; // 1-based line number in the original file
  raw: string; // original row text (for error display)
  identifier: string; // sku or oem_number as supplied
  identifierType: 'sku' | 'oem_number';
  quantity: number;
  valid: boolean;
  error?: string;
}

/** Column headers we recognise for the identifier. */
const SKU_HEADERS = new Set(['sku', 'item', 'part', 'part_number']);
const OEM_HEADERS = new Set(['oem', 'oem_number', 'oem_no', 'manufacturer_number']);

/**
 * Parse a CSV buffer into typed rows. Header row is optional; if the first
 * cell isn't a recognised header we treat every row as data and infer the
 * identifier type per-row (values starting like an OEM pattern vs SKU).
 */
export function parseOrderCsv(buffer: Buffer): ParsedCsvRow[] {
  const text = buffer.toString('utf-8');
  const records: string[][] = parse(text, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (records.length === 0) return [];

  // Detect + strip a header row.
  let identifierType: 'sku' | 'oem_number' | null = null;
  let startIndex = 0;
  const firstCell = (records[0][0] ?? '').toLowerCase();
  if (SKU_HEADERS.has(firstCell)) {
    identifierType = 'sku';
    startIndex = 1;
  } else if (OEM_HEADERS.has(firstCell)) {
    identifierType = 'oem_number';
    startIndex = 1;
  }

  const rows: ParsedCsvRow[] = [];
  for (let i = startIndex; i < records.length; i++) {
    const cols = records[i];
    const lineNo = i + 1;
    const raw = cols.join(',');
    const identifier = (cols[0] ?? '').trim();
    const qtyRaw = (cols[1] ?? '').trim();

    // Per-row inference when no header told us the type.
    // OEM numbers frequently contain a dash; internal SKUs use our own prefix
    // conventions — but we validate against the DB later regardless, so this
    // is only a hint for the lookup path.
    const type: 'sku' | 'oem_number' =
      identifierType ?? (/-/.test(identifier) && !/^[A-Z]{2,}-/.test(identifier) ? 'oem_number' : 'sku');

    const quantity = Number(qtyRaw);
    let valid = true;
    let error: string | undefined;

    if (!identifier) {
      valid = false;
      error = 'Missing SKU/OEM number';
    } else if (!qtyRaw || Number.isNaN(quantity)) {
      valid = false;
      error = 'Quantity is not a number';
    } else if (!Number.isInteger(quantity) || quantity <= 0) {
      valid = false;
      error = 'Quantity must be a positive integer';
    }

    rows.push({ line: lineNo, raw, identifier, identifierType: type, quantity, valid, error });
  }

  return rows;
}
