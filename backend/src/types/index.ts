/**
 * Shared domain types used across backend modules.
 * These mirror the PostgreSQL schema and the JSON contracts returned to the
 * frontend (see frontend/src/lib/types.ts for the client-side mirror).
 */

export type RoleName = 'standard_buyer' | 'dealer';
export type PricingTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  companyName: string | null;
  roles: RoleName[];
}

/** JWT payload we sign at login and verify in auth middleware. */
export interface JwtPayload {
  sub: string; // user id
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

export interface Part {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  oemNumber: string | null;
  category: string;
  price: number;
  currency: string;
  stockQty: number;
}

/** Sundhedsstatus for en maskine (Fase 1). */
export type HealthStatus = 'healthy' | 'due_soon' | 'overdue' | 'unknown';

/** Kort resumé af den mest slidte komponent på en maskine (Fase 2). */
export interface TopWear {
  sku: string;
  title: string;
  wearPct: number;
  remainingHours: number;
}

/** En sliddel med estimeret slid + restlevetid (Fase 2). */
export interface WearComponent {
  sku: string;
  title: string;
  category: string;
  wearPct: number;
  remainingHours: number;
  price: number;
}

/** A row from the user's garage; fleet fields are null for standard buyers. */
export interface GarageEntry {
  id: string;
  machine: Machine;
  nickname: string | null;
  customerName: string | null;
  jobId: string | null;
  serialNumber: string | null;
  createdAt: string;
  // --- Fase 1: sundhed & driftstimer ---
  currentHours: number | null;
  lastServiceHours: number | null;
  hoursSinceService: number | null;
  serviceIntervalHours: number;
  healthScore: number | null;
  healthStatus: HealthStatus;
  // --- Fase 2: værste sliddel ---
  topWear: TopWear | null;
}

/** En post i vedligeholds-logbogen (Fase 4). */
export type MaintenanceType = 'service' | 'repair' | 'inspection' | 'part_replaced' | 'note';

export interface MaintenanceEntry {
  id: string;
  type: MaintenanceType;
  title: string;
  hours: number | null;
  sku: string | null;
  loggedAt: string;
}

export interface MaintenanceLog {
  entries: MaintenanceEntry[];
  serviceCount: number;
  streak: number; // antal services på tid i træk
}

/** En milepæl/achievement (Fase 4). */
export interface Achievement {
  key: string;
  icon: string;
  label: string;
  description: string;
  unlocked: boolean;
}

/** Garage-resumé med milepæle (Fase 4). */
export interface GarageSummary {
  machineCount: number;
  servicedCount: number;
  healthyCount: number;
  achievements: Achievement[];
}

/** Brugerens XP/niveau (Fase 5). */
export interface XpEvent {
  action: string;
  points: number;
  ref: string | null;
  createdAt: string;
}

export interface UserProgress {
  xp: number;
  rank: string;
  rankKey: string;
  nextRank: string | null;
  xpToNext: number;
  progressPct: number;
  recent: XpEvent[];
}

/** Forhandlerens tier-status + besparelse (Fase 3). */
export interface DealerStatus {
  tier: PricingTier;
  baseDiscount: number;
  ytdSpend: number;
  ytdSavings: number;
  nextTier: PricingTier | null;
  nextTierThreshold: number | null;
  amountToNext: number | null;
  progressPct: number;
}

/** Result of pricing a single line for a dealer (MODULE 4). */
export interface B2BPriceResult {
  sku: string;
  quantity: number;
  listPrice: number; // standard per-unit price
  netUnitPrice: number; // per-unit price after all discounts
  discountPct: number; // effective total discount applied
  lineTotal: number; // netUnitPrice * quantity
  source: 'contract' | 'tier+volume'; // how the price was derived
}
