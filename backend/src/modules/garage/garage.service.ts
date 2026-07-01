/**
 * MODULE 2 — Garage service.
 * Reads/writes the user's saved machines. Dealers additionally get the
 * fleet fields (customer_name / job_id) hydrated.
 */
import { query, queryOne } from '../../db/pool';
import { GarageEntry } from '../../types';

interface GarageRow {
  id: string;
  nickname: string | null;
  customer_name: string | null;
  job_id: string | null;
  serial_number: string | null;
  created_at: string;
  machine_id: string;
  brand: string;
  model: string;
  year_from: number;
  year_to: number | null;
  category: string;
}

function toEntry(row: GarageRow, includeFleet: boolean): GarageEntry {
  return {
    id: row.id,
    nickname: row.nickname,
    // Fleet fields are only exposed to dealers.
    customerName: includeFleet ? row.customer_name : null,
    jobId: includeFleet ? row.job_id : null,
    serialNumber: row.serial_number,
    createdAt: row.created_at,
    machine: {
      id: row.machine_id,
      brand: row.brand,
      model: row.model,
      yearFrom: row.year_from,
      yearTo: row.year_to,
      category: row.category,
    },
  };
}

/** Fetch all garage entries for a user. */
export async function getGarage(userId: string, includeFleet: boolean): Promise<GarageEntry[]> {
  const rows = await query<GarageRow>(
    `SELECT g.id, g.nickname, g.customer_name, g.job_id, g.serial_number, g.created_at,
            m.id AS machine_id, m.brand, m.model, m.year_from, m.year_to, m.category
       FROM user_garages g
       JOIN machines m ON m.id = g.machine_id
      WHERE g.user_id = $1
      ORDER BY g.created_at DESC`,
    [userId],
  );
  return rows.map((r) => toEntry(r, includeFleet));
}

export interface AddGarageInput {
  machineId: string;
  nickname?: string;
  // Fleet-only (ignored for standard buyers)
  customerName?: string;
  jobId?: string;
  serialNumber?: string;
}

/** Add a machine to a user's garage. Fleet fields are only persisted for dealers. */
export async function addToGarage(
  userId: string,
  input: AddGarageInput,
  isDealer: boolean,
): Promise<GarageEntry> {
  const machine = await queryOne('SELECT 1 FROM machines WHERE id = $1', [input.machineId]);
  if (!machine) {
    throw Object.assign(new Error('Machine not found'), { status: 404 });
  }

  const inserted = await queryOne<{ id: string }>(
    `INSERT INTO user_garages
        (user_id, machine_id, nickname, customer_name, job_id, serial_number)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      userId,
      input.machineId,
      input.nickname ?? null,
      isDealer ? input.customerName ?? null : null,
      isDealer ? input.jobId ?? null : null,
      input.serialNumber ?? null,
    ],
  );

  if (!inserted) {
    throw Object.assign(new Error('Machine already in garage'), { status: 409 });
  }

  const [entry] = await query<GarageRow>(
    `SELECT g.id, g.nickname, g.customer_name, g.job_id, g.serial_number, g.created_at,
            m.id AS machine_id, m.brand, m.model, m.year_from, m.year_to, m.category
       FROM user_garages g
       JOIN machines m ON m.id = g.machine_id
      WHERE g.id = $1`,
    [inserted.id],
  );
  return toEntry(entry, isDealer);
}

/** Remove a garage entry (only if it belongs to the user). */
export async function removeFromGarage(userId: string, garageId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM user_garages WHERE id = $1 AND user_id = $2 RETURNING id`,
    [garageId, userId],
  );
  return rows.length > 0;
}
