/**
 * Demo / mock-data layer for the GitHub Pages preview.
 *
 * When NEXT_PUBLIC_DEMO === 'true' the API client (lib/api.ts) routes every
 * call here instead of hitting the Express backend, so the whole UI is
 * explorable as a static site. The data + pricing logic mirror the backend
 * seed (backend/db/seed.sql) and MODULE 4 pricing rules so the preview behaves
 * realistically.
 */
import type {
  Achievement,
  CsvRow,
  DealerStatus,
  GarageEntry,
  GarageSummary,
  MaintenanceLog,
  MaintenanceType,
  OemLookupResult,
  ResolvedLine,
  RoleName,
  TopWear,
  UserProgress,
  WearComponent,
} from './types';
import { healthScore, healthStatusFor, remainingHours, wearPct } from './gamify';

export const DEMO = process.env.NEXT_PUBLIC_DEMO === 'true';

// --- Mock catalog (mirrors seed.sql) ---------------------------------
interface DemoPart {
  sku: string;
  title: string;
  price: number;
  stock: number;
  category: string;
}

const PARTS: Record<string, DemoPart> = {
  'FD-CAT-320D': { sku: 'FD-CAT-320D', title: 'Final Drive — Cat 320D', price: 3450, stock: 8, category: 'final_drive' },
  'RT-400X72.5': { sku: 'RT-400X72.5', title: 'Gummibælte 400x72.5x74', price: 690, stock: 40, category: 'rubber_track' },
  'FD-PC200': { sku: 'FD-PC200', title: 'Final Drive — Komatsu PC200-8', price: 3980, stock: 5, category: 'final_drive' },
  'RT-300X52.5': { sku: 'RT-300X52.5', title: 'Gummibælte 300x52.5x84 (Bobcat E35)', price: 520, stock: 22, category: 'rubber_track' },
  'FILT-HYD-01': { sku: 'FILT-HYD-01', title: 'Hydraulikfilter — universal', price: 42.5, stock: 300, category: 'filter' },
};

// Forventet levetid (driftstimer) for sliddele — spejler migration 006.
const WEAR_LIFE: Record<string, number> = {
  'FD-CAT-320D': 8000,
  'FD-PC200': 8000,
  'RT-400X72.5': 3000,
  'RT-300X52.5': 3000,
};

// Serviceinterval pr. maskinkategori — spejler service_intervals.
const SERVICE_INTERVAL: Record<string, number> = {
  excavator: 500,
  mini_excavator: 400,
  wheel_loader: 500,
  bulldozer: 500,
  skid_steer: 400,
  other: 500,
};

// External OEM number -> internal SKU (+ manufacturer).
const OEM_MAP: Record<string, { sku: string; manufacturer: string }> = {
  '227-6949': { sku: 'FD-CAT-320D', manufacturer: 'Caterpillar' },
  '2276949': { sku: 'FD-CAT-320D', manufacturer: 'Caterpillar' },
  '87460579': { sku: 'RT-400X72.5', manufacturer: 'Bridgestone' },
  '20Y-27-00432': { sku: 'FD-PC200', manufacturer: 'Komatsu' },
  '6689277': { sku: 'RT-300X52.5', manufacturer: 'Bobcat' },
  '093-7521': { sku: 'FILT-HYD-01', manufacturer: 'Caterpillar' },
};

// Machine id -> compatible SKUs (fitment matrix).
const FITMENT: Record<string, string[]> = {
  'a0000000-0000-0000-0000-000000000001': ['FD-CAT-320D', 'RT-400X72.5', 'FILT-HYD-01'],
  'a0000000-0000-0000-0000-000000000002': ['FD-PC200', 'FILT-HYD-01'],
  'a0000000-0000-0000-0000-000000000003': ['RT-300X52.5'],
};

const MACHINES = {
  m1: { id: 'a0000000-0000-0000-0000-000000000001', brand: 'Caterpillar', model: '320D', yearFrom: 2006, yearTo: 2012, category: 'excavator' },
  m2: { id: 'a0000000-0000-0000-0000-000000000002', brand: 'Komatsu', model: 'PC200-8', yearFrom: 2007, yearTo: 2015, category: 'excavator' },
  m3: { id: 'a0000000-0000-0000-0000-000000000003', brand: 'Bobcat', model: 'E35', yearFrom: 2013, yearTo: null, category: 'mini_excavator' },
} as const;

// Negotiated contract price for the demo gold dealer.
const CONTRACT_PRICES: Record<string, number> = { 'RT-400X72.5': 610 };

// Demo dealer pricing (gold tier = 15% base) + global volume breaks.
const GOLD_BASE_DISCOUNT = 15;
const VOLUME_BREAKS = [
  { minQty: 25, extra: 7 },
  { minQty: 10, extra: 4 },
  { minQty: 5, extra: 2 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

// --- GAMIFICATION Fase 4/5 stores (spejler backend) ------------------
function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAgo);
  return d.toISOString();
}

const XP_VALUES: Record<string, number> = {
  machine_added: 50,
  hours_logged: 10,
  service_logged: 40,
  log_added: 20,
  guide_read: 15,
  order_placed: 30,
};

const RANKS = [
  { key: 'laerling', label: 'Lærling', minXp: 0 },
  { key: 'mekaniker', label: 'Mekaniker', minXp: 100 },
  { key: 'formand', label: 'Formand', minXp: 300 },
  { key: 'mester', label: 'Mestermekaniker', minXp: 700 },
  { key: 'vaerkfoerer', label: 'Værkfører', minXp: 1500 },
];

interface DemoXpEvent {
  action: string;
  points: number;
  ref: string | null;
  createdAt: string;
}

// Seedet så XP-baren starter et pænt sted (Mekaniker på vej mod Formand).
const demoXpEvents: DemoXpEvent[] = [
  { action: 'machine_added', points: 50, ref: null, createdAt: iso(-9) },
  { action: 'machine_added', points: 50, ref: null, createdAt: iso(-8) },
  { action: 'hours_logged', points: 10, ref: null, createdAt: iso(-6) },
  { action: 'service_logged', points: 40, ref: null, createdAt: iso(-5) },
  { action: 'guide_read', points: 15, ref: 'gummibaelter-levetid-og-slid', createdAt: iso(-3) },
  { action: 'service_logged', points: 40, ref: null, createdAt: iso(-2) },
  { action: 'log_added', points: 20, ref: null, createdAt: iso(-1) },
];
const guideReads = new Set<string>(['gummibaelter-levetid-og-slid']);

function awardDemoXp(action: string, ref: string | null = null) {
  const points = XP_VALUES[action];
  if (!points) return;
  if (action === 'guide_read') {
    if (!ref || guideReads.has(ref)) return;
    guideReads.add(ref);
  }
  demoXpEvents.push({ action, points, ref, createdAt: new Date().toISOString() });
}

interface DemoLog {
  id: string;
  type: MaintenanceType;
  title: string;
  hours: number | null;
  sku: string | null;
  loggedAt: string;
}
let logSeq = 0;
const demoLogs: Record<string, DemoLog[]> = {
  g1: [
    { id: `l${logSeq++}`, type: 'service', title: 'Rutineservice', hours: 4950, sku: null, loggedAt: iso(-320) },
    { id: `l${logSeq++}`, type: 'service', title: 'Rutineservice', hours: 5400, sku: null, loggedAt: iso(-160) },
    { id: `l${logSeq++}`, type: 'part_replaced', title: 'Gummibælte skiftet (venstre)', hours: 5400, sku: 'RT-400X72.5', loggedAt: iso(-160) },
    { id: `l${logSeq++}`, type: 'service', title: 'Rutineservice', hours: 5900, sku: null, loggedAt: iso(-30) },
  ],
  g2: [
    { id: `l${logSeq++}`, type: 'service', title: 'Rutineservice', hours: 8500, sku: null, loggedAt: iso(-240) },
    { id: `l${logSeq++}`, type: 'inspection', title: 'Undervognseftersyn', hours: 8900, sku: null, loggedAt: iso(-90) },
    { id: `l${logSeq++}`, type: 'service', title: 'Rutineservice', hours: 9000, sku: null, loggedAt: iso(-60) },
  ],
  g3: [
    { id: `l${logSeq++}`, type: 'service', title: 'Rutineservice', hours: 1500, sku: null, loggedAt: iso(-200) },
    { id: `l${logSeq++}`, type: 'service', title: 'Rutineservice', hours: 1600, sku: null, loggedAt: iso(-90) },
    { id: `l${logSeq++}`, type: 'service', title: 'Rutineservice', hours: 1720, sku: null, loggedAt: iso(-20) },
  ],
};

function demoStreak(hoursAsc: number[], interval: number): number {
  let s = 0;
  for (let i = hoursAsc.length - 1; i > 0; i--) {
    if (hoursAsc[i] - hoursAsc[i - 1] <= interval) s++;
    else break;
  }
  return s;
}

// --- Auth ------------------------------------------------------------
function currentRole(): RoleName {
  if (typeof window === 'undefined') return 'standard_buyer';
  try {
    const raw = window.localStorage.getItem('scanbolt_user');
    if (raw) return (JSON.parse(raw).roles as RoleName[]).includes('dealer') ? 'dealer' : 'standard_buyer';
  } catch {
    /* ignore */
  }
  return 'standard_buyer';
}

export function demoLogin(email: string) {
  // Any email containing "dealer" logs in as the demo dealer so viewers can
  // explore both the standard shop and the full Dealer Portal.
  const isDealer = /dealer/i.test(email);
  const roles: RoleName[] = isDealer ? ['dealer'] : ['standard_buyer'];
  return {
    user: { id: isDealer ? '22222222' : '11111111', email, roles },
    token: 'demo-token',
  };
}

// --- MODULE 2 + GAMIFICATION: garage, sundhed, slid -----------------
type GarageId = 'g1' | 'g2' | 'g3';

interface DemoGarage {
  machine: (typeof MACHINES)[keyof typeof MACHINES];
  nickname: string | null;
  customerName: string | null;
  jobId: string | null;
  serialNumber: string | null;
}

const GARAGES: Record<GarageId, DemoGarage> = {
  g1: { machine: MACHINES.m1, nickname: null, customerName: 'Acme Excavation', jobId: 'JOB-2026-014', serialNumber: 'CAT320D-88213' },
  g2: { machine: MACHINES.m2, nickname: null, customerName: 'Northern Quarry', jobId: 'JOB-2026-021', serialNumber: 'PC200-55901' },
  g3: { machine: MACHINES.m3, nickname: 'Min minigraver', customerName: null, jobId: null, serialNumber: null },
};

// Mutabelt time-lager, så opdateringer holder i sessionen (nulstilles ved reload).
const demoHours: Record<GarageId, { current: number; last: number }> = {
  g1: { current: 6120, last: 5900 }, // 220 t siden service → gul
  g2: { current: 9450, last: 9000 }, // 450 t → rød
  g3: { current: 1780, last: 1720 }, // 60 t → grøn
};

/** Sliddele (med levetid) for en maskine, sorteret mest-slidt først. */
function wearComponentsFor(machineId: string, currentHours: number): WearComponent[] {
  const skus = FITMENT[machineId] ?? [];
  return skus
    .filter((s) => WEAR_LIFE[s] != null)
    .map((s) => ({
      sku: s,
      title: PARTS[s].title,
      category: PARTS[s].category,
      price: PARTS[s].price,
      wearPct: wearPct(currentHours, WEAR_LIFE[s]),
      remainingHours: remainingHours(currentHours, WEAR_LIFE[s]),
    }))
    .sort((a, b) => b.wearPct - a.wearPct);
}

function buildEntry(id: GarageId, includeFleet: boolean): GarageEntry {
  const g = GARAGES[id];
  const h = demoHours[id];
  const interval = SERVICE_INTERVAL[g.machine.category] ?? 500;
  const hasData = h.current > 0;
  const since = hasData ? Math.max(0, h.current - h.last) : null;
  const score = hasData ? healthScore(h.current, h.last, interval) : null;

  let topWear: TopWear | null = null;
  if (hasData) {
    const w = wearComponentsFor(g.machine.id, h.current);
    if (w[0]) topWear = { sku: w[0].sku, title: w[0].title, wearPct: w[0].wearPct, remainingHours: w[0].remainingHours };
  }

  return {
    id,
    machine: g.machine,
    nickname: g.nickname,
    customerName: includeFleet ? g.customerName : null,
    jobId: includeFleet ? g.jobId : null,
    serialNumber: g.serialNumber,
    createdAt: new Date().toISOString(),
    currentHours: hasData ? h.current : null,
    lastServiceHours: hasData ? h.last : null,
    hoursSinceService: since,
    serviceIntervalHours: interval,
    healthScore: score,
    healthStatus: healthStatusFor(score ?? 0, hasData),
    topWear,
  };
}

export function demoGetGarage(): { entries: GarageEntry[]; isDealer: boolean } {
  const isDealer = currentRole() === 'dealer';
  const ids: GarageId[] = isDealer ? ['g1', 'g2'] : ['g3'];
  return { isDealer, entries: ids.map((id) => buildEntry(id, isDealer)) };
}

/** Fase 1 — opdatér driftstimer. */
export function demoUpdateHours(garageId: string, currentHours: number) {
  const h = demoHours[garageId as GarageId];
  if (h) h.current = Math.max(0, Math.floor(currentHours));
  awardDemoXp('hours_logged');
  return { entry: buildEntry(garageId as GarageId, currentRole() === 'dealer') };
}

/** Fase 1+4 — marker som serviceret (nulstil + log service). */
export function demoMarkServiced(garageId: string) {
  const h = demoHours[garageId as GarageId];
  if (h) h.last = h.current;
  const arr = demoLogs[garageId] ?? (demoLogs[garageId] = []);
  arr.push({
    id: `l${logSeq++}`,
    type: 'service',
    title: 'Service udført',
    hours: h?.current ?? null,
    sku: null,
    loggedAt: new Date().toISOString(),
  });
  awardDemoXp('service_logged', garageId);
  return { entry: buildEntry(garageId as GarageId, currentRole() === 'dealer') };
}

/** Fase 2 — fuld slid-liste for én garage-maskine. */
export function demoGetWear(garageId: string) {
  const g = GARAGES[garageId as GarageId];
  const h = demoHours[garageId as GarageId];
  const currentHours = h?.current ?? 0;
  const components = g && currentHours > 0 ? wearComponentsFor(g.machine.id, currentHours) : [];
  return { currentHours, components };
}

/** Fase 3 — forhandler tier-status + besparelse (mock-tal). */
export function demoDealerStatus(): DealerStatus {
  return {
    tier: 'gold',
    baseDiscount: 15,
    ytdSpend: 187600,
    ytdSavings: 84320,
    nextTier: 'platinum',
    nextTierThreshold: 200000,
    amountToNext: 12400,
    progressPct: 90,
  };
}

// --- Fase 4 — logbog & milepæle -------------------------------------
export function demoGetMaintenanceLog(garageId: string): MaintenanceLog {
  const logs = (demoLogs[garageId] ?? [])
    .slice()
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt) || (b.hours ?? 0) - (a.hours ?? 0));
  const g = GARAGES[garageId as GarageId];
  const interval = g ? SERVICE_INTERVAL[g.machine.category] ?? 500 : 500;
  const serviceHours = logs
    .filter((l) => l.type === 'service' && l.hours != null)
    .map((l) => l.hours as number)
    .sort((a, b) => a - b);
  return {
    entries: logs.map((l) => ({ id: l.id, type: l.type, title: l.title, hours: l.hours, sku: l.sku, loggedAt: l.loggedAt })),
    serviceCount: logs.filter((l) => l.type === 'service').length,
    streak: demoStreak(serviceHours, interval),
  };
}

export function demoAddMaintenanceLog(
  garageId: string,
  input: { type: MaintenanceType; title: string; hours?: number | null; sku?: string | null },
): MaintenanceLog {
  const arr = demoLogs[garageId] ?? (demoLogs[garageId] = []);
  arr.push({
    id: `l${logSeq++}`,
    type: input.type,
    title: input.title,
    hours: input.hours ?? null,
    sku: input.sku ?? null,
    loggedAt: new Date().toISOString(),
  });
  awardDemoXp('log_added', garageId);
  return demoGetMaintenanceLog(garageId);
}

const ACHIEVEMENTS: Omit<Achievement, 'unlocked'>[] = [
  { key: 'first_machine', icon: '🚜', label: 'Garage åbnet', description: 'Tilføj din første maskine' },
  { key: 'hours_logged', icon: '⏱️', label: 'Timetal på plads', description: 'Log timetal på en maskine' },
  { key: 'first_service', icon: '🔧', label: 'Første service', description: 'Registrér en service i logbogen' },
  { key: 'on_time_streak', icon: '🔥', label: 'På-tid-stribe', description: 'To services på tid i træk' },
  { key: 'all_healthy', icon: '✅', label: 'Hele flåden sund', description: 'Alle maskiner er sunde' },
  { key: 'knowledge', icon: '📚', label: 'Videbegærlig', description: 'Læs en guide i Viden' },
];

export function demoGetSummary(): GarageSummary {
  const isDealer = currentRole() === 'dealer';
  const ids: GarageId[] = isDealer ? ['g1', 'g2'] : ['g3'];
  const entries = ids.map((id) => buildEntry(id, isDealer));
  const machineCount = entries.length;
  const healthyCount = entries.filter((e) => e.healthStatus === 'healthy').length;
  const anyHours = entries.some((e) => e.currentHours != null);

  let bestStreak = 0;
  let servicedCount = 0;
  for (const id of ids) {
    const log = demoGetMaintenanceLog(id);
    servicedCount += log.serviceCount;
    bestStreak = Math.max(bestStreak, log.streak);
  }

  const unlocked: Record<string, boolean> = {
    first_machine: machineCount >= 1,
    hours_logged: anyHours,
    first_service: servicedCount >= 1,
    on_time_streak: bestStreak >= 2,
    all_healthy: machineCount > 0 && healthyCount === machineCount,
    knowledge: guideReads.size > 0,
  };

  return {
    machineCount,
    servicedCount,
    healthyCount,
    achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked[a.key] ?? false })),
  };
}

// --- Fase 5 — XP / niveau -------------------------------------------
export function demoGetProgress(): UserProgress {
  const xp = demoXpEvents.reduce((s, e) => s + e.points, 0);
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].minXp) idx = i;
  const rank = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  const xpToNext = next ? Math.max(0, next.minXp - xp) : 0;
  const progressPct = next
    ? Math.min(100, Math.round(((xp - rank.minXp) / (next.minXp - rank.minXp)) * 100))
    : 100;
  const recent = demoXpEvents
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);
  return { xp, rank: rank.label, rankKey: rank.key, nextRank: next?.label ?? null, xpToNext, progressPct, recent };
}

export function demoTrackAction(action: string, ref: string | null): UserProgress {
  awardDemoXp(action, ref);
  return demoGetProgress();
}

export function demoProductsForMachine(machineId: string) {
  const skus = FITMENT[machineId] ?? [];
  return { machineId, parts: skus.map((s) => ({ ...PARTS[s] })) };
}

/** Alle maskiner (til maskinvælgeren i headeren). */
export function demoMachines() {
  return Object.values(MACHINES).map((m) => ({ ...m }));
}

/** Hele kataloget (til produktoversigten uden valgt maskine). */
export function demoAllProducts() {
  return { parts: Object.values(PARTS).map((p) => ({ ...p })) };
}

// --- MODULE 3/4: pricing, quick order, oem, csv ---------------------
function priceLine(sku: string, quantity: number): ResolvedLine {
  const part = PARTS[sku];
  if (!part) {
    return { sku, title: '—', quantity, availableStock: 0, inStock: false, listPrice: 0, netUnitPrice: 0, discountPct: 0, lineTotal: 0, error: 'SKU not found' };
  }
  const isDealer = currentRole() === 'dealer';
  let netUnit = part.price;
  let discountPct = 0;

  if (isDealer) {
    if (CONTRACT_PRICES[sku] != null) {
      netUnit = CONTRACT_PRICES[sku];
      discountPct = part.price > 0 ? round2((1 - netUnit / part.price) * 100) : 0;
    } else {
      const volume = VOLUME_BREAKS.find((b) => quantity >= b.minQty)?.extra ?? 0;
      discountPct = Math.min(GOLD_BASE_DISCOUNT + volume, 60);
      netUnit = round2(part.price * (1 - discountPct / 100));
    }
  }

  const inStock = part.stock >= quantity;
  return {
    sku,
    title: part.title,
    quantity,
    availableStock: part.stock,
    inStock,
    listPrice: round2(part.price),
    netUnitPrice: round2(netUnit),
    discountPct: round2(discountPct),
    lineTotal: round2(netUnit * quantity),
    error: inStock ? undefined : `Only ${part.stock} in stock`,
  };
}

export function demoQuickOrder(lines: { sku: string; quantity: number }[]) {
  const items = lines.map((l) => priceLine(l.sku.toUpperCase(), l.quantity));
  const grandTotal = round2(items.reduce((s, i) => (i.inStock ? s + i.lineTotal : s), 0));
  return { items, grandTotal };
}

export function demoOemLookup(oemNumber: string): OemLookupResult {
  const key = Object.keys(OEM_MAP).find((k) => k.toUpperCase() === oemNumber.toUpperCase());
  if (!key) return { oemNumber, matched: false };
  const { sku, manufacturer } = OEM_MAP[key];
  const part = PARTS[sku];
  return { oemNumber, matched: true, sku, title: part.title, manufacturer, availableStock: part.stock, inStock: part.stock > 0 };
}

/** Parse a CSV File entirely in the browser and resolve rows against the mock catalog. */
export async function demoUploadCsv(file: File) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const SKU_HEADERS = new Set(['sku', 'item', 'part', 'part_number']);
  const OEM_HEADERS = new Set(['oem', 'oem_number', 'oem_no', 'manufacturer_number']);

  let headerType: 'sku' | 'oem_number' | null = null;
  let start = 0;
  const firstCell = (lines[0]?.split(',')[0] ?? '').toLowerCase();
  if (SKU_HEADERS.has(firstCell)) { headerType = 'sku'; start = 1; }
  else if (OEM_HEADERS.has(firstCell)) { headerType = 'oem_number'; start = 1; }

  const rows: CsvRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const identifier = cols[0] ?? '';
    const qtyRaw = cols[1] ?? '';
    const quantity = Number(qtyRaw);
    const type: 'sku' | 'oem_number' =
      headerType ?? (/-/.test(identifier) && !/^[A-Z]{2,}-/.test(identifier) ? 'oem_number' : 'sku');

    const base: CsvRow = { line: i + 1, raw: lines[i], identifier, identifierType: type, quantity, valid: true, resolved: false };

    if (!identifier) { rows.push({ ...base, valid: false, error: 'Missing SKU/OEM number' }); continue; }
    if (!qtyRaw || Number.isNaN(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      rows.push({ ...base, valid: false, error: 'Quantity must be a positive integer' });
      continue;
    }

    if (type === 'oem_number') {
      const lookup = demoOemLookup(identifier);
      if (!lookup.matched) rows.push({ ...base, valid: false, error: 'OEM number not found' });
      else rows.push({ ...base, sku: lookup.sku, title: lookup.title, availableStock: lookup.availableStock, resolved: true });
    } else {
      const upper = identifier.toUpperCase();
      const part = PARTS[upper];
      if (!part) rows.push({ ...base, valid: false, error: 'SKU not found' });
      else rows.push({ ...base, identifier: upper, sku: upper, title: part.title, availableStock: part.stock, resolved: true });
    }
  }

  const validCount = rows.filter((r) => r.resolved).length;
  return { totalRows: rows.length, validCount, invalidCount: rows.length - validCount, rows };
}

export function demoCheckout(payload: { lines: { sku: string; quantity: number }[]; garageId?: string }) {
  const { grandTotal } = demoQuickOrder(payload.lines);
  const dealerGarage = payload.garageId === 'g1'
    ? { jobId: 'JOB-2026-014', customerName: 'Acme Excavation' }
    : payload.garageId === 'g2'
      ? { jobId: 'JOB-2026-021', customerName: 'Northern Quarry' }
      : { jobId: null, customerName: null };
  return {
    orderId: `demo-${Date.now().toString(36)}`,
    grandTotal,
    jobId: dealerGarage.jobId,
    customerName: dealerGarage.customerName,
    erpReference: `BC-SO-DEMO${dealerGarage.jobId ? '-' + dealerGarage.jobId : ''}`,
  };
}
