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

/** A row from the user's garage; fleet fields are null for standard buyers. */
export interface GarageEntry {
  id: string;
  machine: Machine;
  nickname: string | null;
  customerName: string | null;
  jobId: string | null;
  serialNumber: string | null;
  createdAt: string;
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
