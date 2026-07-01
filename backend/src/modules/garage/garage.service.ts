/**
 * MODULE 2 — Garage service.
 * Reads/writes the user's saved machines. Dealers additionally get the
 * fleet fields (customer_name / job_id) hydrated. Since Fase 1/2 each entry
 * also carries a health score (service hours) and the worst wearing component.
 */
import { query, queryOne } from '../../db/pool';
import { GarageEntry, TopWear, WearComponent } from '../../types';
import {
  DEFAULT_SERVICE_INTERVAL,
  healthScore,
  healthStatus,
  remainingHours,
  wearPct,
} from './gamify';

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
  current_hours: number | null;
  last_service_hours: number | null;
  interval_hours: number | null;
}

const GARAGE_SELECT = `
  SELECT g.id, g.nickname, g.customer_name, g.job_id, g.serial_number, g.created_at,
         m.id AS machine_id, m.brand, m.model, m.year_from, m.year_to, m.category,
         s.current_hours, s.last_service_hours,
         COALESCE(si.interval_hours, ${DEFAULT_SERVICE_INTERVAL}) AS interval_hours
    FROM user_garages g
    JOIN machines m ON m.id = g.machine_id
    LEFT JOIN machine_service_status s ON s.garage_id = g.id
    LEFT JOIN service_intervals si ON si.category = m.category`;

interface WearRow {
  sku: string;
  title: string;
  category: string;
  price: string;
  wear_life_hours: number;
}

/** Compute the wearing components for a machine given its current hours. */
async function getWearForMachine(
  machineId: string,
  currentHours: number,
): Promise<WearComponent[]> {
  const rows = await query<WearRow>(
    `SELECT p.sku, p.title, p.category, p.price, p.wear_life_hours
       FROM machine_parts_compatibility mpc
       JOIN parts p ON p.id = mpc.part_id
      WHERE mpc.machine_id = $1
        AND p.is_active = TRUE
        AND p.wear_life_hours IS NOT NULL
      ORDER BY p.title`,
    [machineId],
  );
  return rows
    .map((r) => ({
      sku: r.sku,
      title: r.title,
      category: r.category,
      price: Number(r.price),
      wearPct: wearPct(currentHours, r.wear_life_hours),
      remainingHours: remainingHours(currentHours, r.wear_life_hours),
    }))
    .sort((a, b) => b.wearPct - a.wearPct);
}

async function toEntry(row: GarageRow, includeFleet: boolean): Promise<GarageEntry> {
  const hasData = row.current_hours != null && row.current_hours > 0;
  const currentHours = row.current_hours ?? null;
  const lastServiceHours = row.last_service_hours ?? null;
  const interval = row.interval_hours ?? DEFAULT_SERVICE_INTERVAL;
  const since = hasData ? Math.max(0, (currentHours ?? 0) - (lastServiceHours ?? 0)) : null;
  const score = hasData ? healthScore(currentHours ?? 0, lastServiceHours ?? 0, interval) : null;

  // Fase 2: værste sliddel (kun når timetal kendes).
  let topWear: TopWear | null = null;
  if (hasData) {
    const wear = await getWearForMachine(row.machine_id, currentHours ?? 0);
    if (wear[0]) {
      topWear = {
        sku: wear[0].sku,
        title: wear[0].title,
        wearPct: wear[0].wearPct,
        remainingHours: wear[0].remainingHours,
      };
    }
  }

  return {
    id: row.id,
    nickname: row.nickname,
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
    currentHours,
    lastServiceHours,
    hoursSinceService: since,
    serviceIntervalHours: interval,
    healthScore: score,
    healthStatus: healthStatus(score ?? 0, hasData),
    topWear,
  };
}

/** Fetch all garage entries for a user. */
export async function getGarage(userId: string, includeFleet: boolean): Promise<GarageEntry[]> {
  const rows = await query<GarageRow>(
    `${GARAGE_SELECT} WHERE g.user_id = $1 ORDER BY g.created_at DESC`,
    [userId],
  );
  return Promise.all(rows.map((r) => toEntry(r, includeFleet)));
}

/** Fetch one garage entry that belongs to the user (or null). */
async function getEntry(
  userId: string,
  garageId: string,
  includeFleet: boolean,
): Promise<GarageEntry | null> {
  const row = await queryOne<GarageRow>(
    `${GARAGE_SELECT} WHERE g.id = $1 AND g.user_id = $2`,
    [garageId, userId],
  );
  return row ? toEntry(row, includeFleet) : null;
}

export interface AddGarageInput {
  machineId: string;
  nickname?: string;
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

  // Opret et (tomt) service-status så Fase 1 har en række at opdatere.
  await query(
    `INSERT INTO machine_service_status (garage_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [inserted.id],
  );

  const entry = await getEntry(userId, inserted.id, isDealer);
  return entry!;
}

/** Remove a garage entry (only if it belongs to the user). */
export async function removeFromGarage(userId: string, garageId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM user_garages WHERE id = $1 AND user_id = $2 RETURNING id`,
    [garageId, userId],
  );
  return rows.length > 0;
}

/** Fase 1: opdatér driftstimer (upsert service-status). */
export async function updateHours(
  userId: string,
  garageId: string,
  currentHours: number,
  isDealer: boolean,
): Promise<GarageEntry> {
  const owns = await queryOne('SELECT 1 FROM user_garages WHERE id = $1 AND user_id = $2', [
    garageId,
    userId,
  ]);
  if (!owns) throw Object.assign(new Error('Garage entry not found'), { status: 404 });

  await query(
    `INSERT INTO machine_service_status (garage_id, current_hours, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (garage_id)
     DO UPDATE SET current_hours = EXCLUDED.current_hours, updated_at = now()`,
    [garageId, Math.max(0, Math.floor(currentHours))],
  );

  const entry = await getEntry(userId, garageId, isDealer);
  return entry!;
}

/** Fase 1: marker som serviceret (nulstil timer-siden-service). */
export async function markServiced(
  userId: string,
  garageId: string,
  isDealer: boolean,
): Promise<GarageEntry> {
  const owns = await queryOne('SELECT 1 FROM user_garages WHERE id = $1 AND user_id = $2', [
    garageId,
    userId,
  ]);
  if (!owns) throw Object.assign(new Error('Garage entry not found'), { status: 404 });

  await query(
    `UPDATE machine_service_status
        SET last_service_hours = current_hours, updated_at = now()
      WHERE garage_id = $1`,
    [garageId],
  );

  const entry = await getEntry(userId, garageId, isDealer);
  return entry!;
}

/** Fase 2: fuld slid-liste for én garage-maskine. */
export async function getWear(
  userId: string,
  garageId: string,
): Promise<{ currentHours: number; components: WearComponent[] }> {
  const row = await queryOne<{ machine_id: string; current_hours: number | null }>(
    `SELECT g.machine_id, s.current_hours
       FROM user_garages g
       LEFT JOIN machine_service_status s ON s.garage_id = g.id
      WHERE g.id = $1 AND g.user_id = $2`,
    [garageId, userId],
  );
  if (!row) throw Object.assign(new Error('Garage entry not found'), { status: 404 });

  const currentHours = row.current_hours ?? 0;
  const components = currentHours > 0 ? await getWearForMachine(row.machine_id, currentHours) : [];
  return { currentHours, components };
}
