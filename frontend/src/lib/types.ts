/**
 * Client-side mirror of the backend domain types (backend/src/types).
 * Kept intentionally minimal — only what the UI renders.
 */
export type RoleName = 'standard_buyer' | 'dealer';

export interface AuthUser {
  id: string;
  email: string;
  roles: RoleName[];
}

export interface Machine {
  id: string;
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number | null;
  category: string;
}

export interface GarageEntry {
  id: string;
  machine: Machine;
  nickname: string | null;
  customerName: string | null; // dealer/fleet only
  jobId: string | null; // dealer/fleet only
  serialNumber: string | null;
  createdAt: string;
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

export interface OemLookupResult {
  oemNumber: string;
  matched: boolean;
  sku?: string;
  title?: string;
  manufacturer?: string;
  availableStock?: number;
  inStock?: boolean;
}

export interface CsvRow {
  line: number;
  raw: string;
  identifier: string;
  identifierType: 'sku' | 'oem_number';
  quantity: number;
  valid: boolean;
  error?: string;
  sku?: string;
  title?: string;
  availableStock?: number;
  resolved: boolean;
}
