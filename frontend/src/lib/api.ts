/**
 * Thin typed fetch wrapper around the Scanbolt API.
 * Injects the bearer token from localStorage and normalizes error handling.
 */
import type {
  CsvRow,
  DealerStatus,
  GarageEntry,
  GarageSummary,
  MaintenanceLog,
  MaintenanceType,
  OemLookupResult,
  ResolvedLine,
  UserProgress,
  WearComponent,
} from './types';
import {
  DEMO,
  demoAddMaintenanceLog,
  demoAllProducts,
  demoCheckout,
  demoDealerStatus,
  demoGetGarage,
  demoGetMaintenanceLog,
  demoGetProgress,
  demoGetSummary,
  demoGetWear,
  demoLogin,
  demoMachines,
  demoMarkServiced,
  demoOemLookup,
  demoProductsForMachine,
  demoQuickOrder,
  demoTrackAction,
  demoUpdateHours,
  demoUploadCsv,
} from './demoData';

/** Fortæl XP-baren m.fl. at progressionen kan være ændret. */
function notifyProgress(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('scanbolt:progress'));
}

export interface MachineOption {
  id: string;
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number | null;
  category: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('scanbolt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // MODULE 1
  async login(email: string, password: string) {
    if (DEMO) return demoLogin(email);
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handle<{ user: { id: string; email: string; roles: ('standard_buyer' | 'dealer')[] }; token: string }>(res);
  },

  // MODULE 2
  async getGarage() {
    if (DEMO) return demoGetGarage();
    const res = await fetch(`${API_URL}/api/garage`, { headers: authHeaders() });
    return handle<{ entries: GarageEntry[]; isDealer: boolean }>(res);
  },

  async getProductsForMachine(machineId: string) {
    if (DEMO) return demoProductsForMachine(machineId);
    const res = await fetch(`${API_URL}/api/products?machine_id=${encodeURIComponent(machineId)}`, {
      headers: authHeaders(),
    });
    return handle<{ machineId: string; parts: unknown[] }>(res);
  },

  async getAllProducts() {
    if (DEMO) return demoAllProducts();
    const res = await fetch(`${API_URL}/api/products`, { headers: authHeaders() });
    return handle<{ parts: unknown[] }>(res);
  },

  async getMachines() {
    if (DEMO) return { machines: demoMachines() };
    const res = await fetch(`${API_URL}/api/machines`, { headers: authHeaders() });
    return handle<{ machines: MachineOption[] }>(res);
  },

  // GAMIFICATION Fase 1 — driftstimer & sundhed
  async updateHours(garageId: string, currentHours: number) {
    if (DEMO) {
      const r = demoUpdateHours(garageId, currentHours);
      notifyProgress();
      return r;
    }
    const res = await fetch(`${API_URL}/api/garage/${garageId}/hours`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ currentHours }),
    });
    const out = await handle<{ entry: GarageEntry }>(res);
    notifyProgress();
    return out;
  },

  async markServiced(garageId: string) {
    if (DEMO) {
      const r = demoMarkServiced(garageId);
      notifyProgress();
      return r;
    }
    const res = await fetch(`${API_URL}/api/garage/${garageId}/service`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const out = await handle<{ entry: GarageEntry }>(res);
    notifyProgress();
    return out;
  },

  // GAMIFICATION Fase 2 — slid-estimat
  async getWear(garageId: string) {
    if (DEMO) return demoGetWear(garageId);
    const res = await fetch(`${API_URL}/api/garage/${garageId}/wear`, { headers: authHeaders() });
    return handle<{ currentHours: number; components: WearComponent[] }>(res);
  },

  // GAMIFICATION Fase 3 — forhandler-status
  async getDealerStatus() {
    if (DEMO) return demoDealerStatus();
    const res = await fetch(`${API_URL}/api/dealer/status`, { headers: authHeaders() });
    return handle<DealerStatus>(res);
  },

  // GAMIFICATION Fase 4 — vedligeholds-logbog & milepæle
  async getMaintenanceLog(garageId: string) {
    if (DEMO) return demoGetMaintenanceLog(garageId);
    const res = await fetch(`${API_URL}/api/garage/${garageId}/log`, { headers: authHeaders() });
    return handle<MaintenanceLog>(res);
  },

  async addMaintenanceLog(
    garageId: string,
    input: { type: MaintenanceType; title: string; hours?: number | null; sku?: string | null },
  ) {
    if (DEMO) {
      const r = demoAddMaintenanceLog(garageId, input);
      notifyProgress();
      return r;
    }
    const res = await fetch(`${API_URL}/api/garage/${garageId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    const out = await handle<MaintenanceLog>(res);
    notifyProgress();
    return out;
  },

  async getSummary() {
    if (DEMO) return demoGetSummary();
    const res = await fetch(`${API_URL}/api/garage/summary`, { headers: authHeaders() });
    return handle<GarageSummary>(res);
  },

  // GAMIFICATION Fase 5 — XP / niveau
  async getProgress() {
    if (DEMO) return demoGetProgress();
    const res = await fetch(`${API_URL}/api/progress`, { headers: authHeaders() });
    return handle<UserProgress>(res);
  },

  async trackAction(action: string, ref?: string) {
    if (DEMO) {
      const r = demoTrackAction(action, ref ?? null);
      notifyProgress();
      return r;
    }
    const res = await fetch(`${API_URL}/api/progress/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ action, ref: ref ?? null }),
    });
    const out = await handle<UserProgress>(res);
    notifyProgress();
    return out;
  },

  // MODULE 3
  async quickOrder(lines: { sku: string; quantity: number }[]) {
    if (DEMO) return demoQuickOrder(lines);
    const res = await fetch(`${API_URL}/api/dealer/quick-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ lines }),
    });
    return handle<{ items: ResolvedLine[]; grandTotal: number }>(res);
  },

  async oemLookup(oemNumber: string) {
    if (DEMO) return demoOemLookup(oemNumber);
    const res = await fetch(`${API_URL}/api/dealer/oem-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ oemNumber }),
    });
    return handle<OemLookupResult>(res);
  },

  async uploadCsv(file: File) {
    if (DEMO) return demoUploadCsv(file);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_URL}/api/dealer/upload-csv`, {
      method: 'POST',
      headers: authHeaders(), // do NOT set Content-Type; browser sets the multipart boundary
      body: form,
    });
    return handle<{ totalRows: number; validCount: number; invalidCount: number; rows: CsvRow[] }>(res);
  },

  // MODULE 4
  async checkout(payload: { lines: { sku: string; quantity: number }[]; garageId?: string; poNumber?: string }) {
    if (DEMO) return demoCheckout(payload);
    const res = await fetch(`${API_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    return handle<{ orderId: string; grandTotal: number; jobId: string | null; customerName: string | null; erpReference: string | null }>(res);
  },
};
