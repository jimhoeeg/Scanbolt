/**
 * Thin typed fetch wrapper around the Scanbolt API.
 * Injects the bearer token from localStorage and normalizes error handling.
 */
import type { CsvRow, GarageEntry, OemLookupResult, ResolvedLine } from './types';

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
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handle<{ user: { id: string; email: string; roles: ('standard_buyer' | 'dealer')[] }; token: string }>(res);
  },

  // MODULE 2
  async getGarage() {
    const res = await fetch(`${API_URL}/api/garage`, { headers: authHeaders() });
    return handle<{ entries: GarageEntry[]; isDealer: boolean }>(res);
  },

  async getProductsForMachine(machineId: string) {
    const res = await fetch(`${API_URL}/api/products?machine_id=${encodeURIComponent(machineId)}`, {
      headers: authHeaders(),
    });
    return handle<{ machineId: string; parts: unknown[] }>(res);
  },

  // MODULE 3
  async quickOrder(lines: { sku: string; quantity: number }[]) {
    const res = await fetch(`${API_URL}/api/dealer/quick-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ lines }),
    });
    return handle<{ items: ResolvedLine[]; grandTotal: number }>(res);
  },

  async oemLookup(oemNumber: string) {
    const res = await fetch(`${API_URL}/api/dealer/oem-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ oemNumber }),
    });
    return handle<OemLookupResult>(res);
  },

  async uploadCsv(file: File) {
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
    const res = await fetch(`${API_URL}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });
    return handle<{ orderId: string; grandTotal: number; jobId: string | null; customerName: string | null; erpReference: string | null }>(res);
  },
};
