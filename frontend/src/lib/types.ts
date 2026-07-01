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

export type HealthStatus = 'healthy' | 'due_soon' | 'overdue' | 'unknown';

export interface TopWear {
  sku: string;
  title: string;
  wearPct: number;
  remainingHours: number;
}

export interface WearComponent {
  sku: string;
  title: string;
  category: string;
  wearPct: number;
  remainingHours: number;
  price: number;
}

export interface GarageEntry {
  id: string;
  machine: Machine;
  nickname: string | null;
  customerName: string | null; // dealer/fleet only
  jobId: string | null; // dealer/fleet only
  serialNumber: string | null;
  createdAt: string;
  // Fase 1 — sundhed & driftstimer
  currentHours: number | null;
  lastServiceHours: number | null;
  hoursSinceService: number | null;
  serviceIntervalHours: number;
  healthScore: number | null;
  healthStatus: HealthStatus;
  // Fase 2 — værste sliddel
  topWear: TopWear | null;
}

export interface DealerStatus {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  baseDiscount: number;
  ytdSpend: number;
  ytdSavings: number;
  nextTier: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  nextTierThreshold: number | null;
  amountToNext: number | null;
  progressPct: number;
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
