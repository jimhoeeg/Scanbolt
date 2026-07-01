/**
 * MODULE 2 — Machines list (powers the header machine picker).
 *   GET /api/machines            All machines (optionally ?brand= / ?category=).
 *   GET /api/machines/brands     Distinct brand list.
 */
import { Router } from 'express';
import { query } from '../../db/pool';
import { Machine } from '../../types';

const router = Router();

interface MachineRow {
  id: string;
  brand: string;
  model: string;
  year_from: number;
  year_to: number | null;
  category: string;
}

function toMachine(row: MachineRow): Machine {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    category: row.category,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const brand = (req.query.brand as string | undefined) ?? null;
    const category = (req.query.category as string | undefined) ?? null;
    const rows = await query<MachineRow>(
      `SELECT id, brand, model, year_from, year_to, category
         FROM machines
        WHERE ($1::text IS NULL OR brand = $1)
          AND ($2::text IS NULL OR category = $2)
        ORDER BY brand, model, year_from`,
      [brand, category],
    );
    res.json({ machines: rows.map(toMachine) });
  } catch (err) {
    next(err);
  }
});

router.get('/brands', async (_req, res, next) => {
  try {
    const rows = await query<{ brand: string }>(
      `SELECT DISTINCT brand FROM machines ORDER BY brand`,
    );
    res.json({ brands: rows.map((r) => r.brand) });
  } catch (err) {
    next(err);
  }
});

export default router;
