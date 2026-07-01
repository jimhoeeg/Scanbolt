/**
 * MODULE 2 — Products (fitment-filtered catalog).
 *   GET /api/products?machine_id=XYZ   Parts compatible with a machine.
 *   GET /api/products                  Full active catalog (paginated).
 *
 * When a machine_id is supplied we join through machine_parts_compatibility
 * so only genuinely-fitting parts come back — this is what powers the
 * "shop for this machine" flow in My Garage.
 */
import { Router } from 'express';
import { query } from '../../db/pool';
import { Part } from '../../types';

const router = Router();

interface PartRow {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  oem_number: string | null;
  category: string;
  price: string; // NUMERIC comes back as string from pg
  currency: string;
  stock_qty: number;
  position?: string | null;
}

function toPart(row: PartRow): Part & { position?: string | null } {
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    description: row.description,
    oemNumber: row.oem_number,
    category: row.category,
    price: Number(row.price),
    currency: row.currency,
    stockQty: row.stock_qty,
    position: row.position ?? null,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const machineId = req.query.machine_id as string | undefined;
    const category = req.query.category as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);

    if (machineId) {
      // Fitment-filtered catalog for one machine.
      const rows = await query<PartRow>(
        `SELECT p.id, p.sku, p.title, p.description, p.oem_number, p.category,
                p.price, p.currency, p.stock_qty, mpc.position
           FROM machine_parts_compatibility mpc
           JOIN parts p ON p.id = mpc.part_id
          WHERE mpc.machine_id = $1
            AND p.is_active = TRUE
          ORDER BY p.category, p.title`,
        [machineId],
      );
      return res.json({ machineId, parts: rows.map(toPart) });
    }

    // Full catalog (optionally filtered by category).
    const rows = await query<PartRow>(
      `SELECT id, sku, title, description, oem_number, category, price, currency, stock_qty
         FROM parts
        WHERE is_active = TRUE
          AND ($1::text IS NULL OR category = $1)
        ORDER BY title
        LIMIT $2 OFFSET $3`,
      [category ?? null, limit, offset],
    );
    return res.json({ parts: rows.map(toPart), limit, offset });
  } catch (err) {
    return next(err);
  }
});

export default router;
