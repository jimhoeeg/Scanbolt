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
  CsvRow,
  DealerStatus,
  GarageEntry,
  OemLookupResult,
  ResolvedLine,
  RoleName,
  TopWear,
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
  return { entry: buildEntry(garageId as GarageId, currentRole() === 'dealer') };
}

/** Fase 1 — marker som serviceret. */
export function demoMarkServiced(garageId: string) {
  const h = demoHours[garageId as GarageId];
  if (h) h.last = h.current;
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
