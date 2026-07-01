/**
 * GAMIFICATION (frontend) — beregning + præsentation for sundhed/slid.
 * Beregningerne spejler backend/src/modules/garage/gamify.ts, så demo-mode
 * (mock) og rigtig backend giver samme resultat.
 */
import type { HealthStatus } from './types';

export const DEFAULT_SERVICE_INTERVAL = 500;

export function healthScore(currentHours: number, lastServiceHours: number, intervalHours: number): number {
  const since = Math.max(0, currentHours - lastServiceHours);
  const interval = intervalHours > 0 ? intervalHours : DEFAULT_SERVICE_INTERVAL;
  return Math.round(100 * (1 - Math.min(1, since / interval)));
}

export function healthStatusFor(score: number, hasData: boolean): HealthStatus {
  if (!hasData) return 'unknown';
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'due_soon';
  return 'overdue';
}

export function wearPct(currentHours: number, wearLifeHours: number): number {
  if (wearLifeHours <= 0) return 0;
  return Math.min(100, Math.round((currentHours / wearLifeHours) * 100));
}

export function remainingHours(currentHours: number, wearLifeHours: number): number {
  return Math.max(0, wearLifeHours - currentHours);
}

/** Farve + dansk label pr. sundhedsstatus (til ring, badges osv.). */
export const HEALTH_UI: Record<HealthStatus, { label: string; ring: string; text: string; bg: string }> = {
  healthy: { label: 'Sund', ring: '#6cb33f', text: 'text-brand-green-dark', bg: 'bg-brand-green/15' },
  due_soon: { label: 'Service snart', ring: '#f5a300', text: 'text-amber-600', bg: 'bg-amber-100' },
  overdue: { label: 'Service nu', ring: '#b0261c', text: 'text-brand-red', bg: 'bg-brand-red/10' },
  unknown: { label: 'Tilføj timetal', ring: '#c5cbd3', text: 'text-gray-400', bg: 'bg-gray-100' },
};

/** Farve til slid-bjælke afhængig af hvor slidt komponenten er. */
export function wearColor(pct: number): string {
  if (pct >= 90) return 'bg-brand-red';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-brand-green';
}

/** Formatér timer pænt (dansk). */
export function fmtHours(n: number): string {
  return `${n.toLocaleString('da-DK')} t`;
}

/** Formatér kroner (heltal). */
export function fmtKr(n: number): string {
  return `${Math.round(n).toLocaleString('da-DK')} kr`;
}

/** Ikon pr. rang (Fase 5). */
export const RANK_ICON: Record<string, string> = {
  laerling: '🔰',
  mekaniker: '🔧',
  formand: '🛠️',
  mester: '🏅',
  vaerkfoerer: '👷',
};

/** Dansk label pr. XP-handling (til "seneste aktivitet"). */
export const XP_ACTION_LABEL: Record<string, string> = {
  machine_added: 'Maskine tilføjet',
  hours_logged: 'Timetal opdateret',
  service_logged: 'Service registreret',
  log_added: 'Logbogspost tilføjet',
  guide_read: 'Guide læst',
  order_placed: 'Ordre afgivet',
};

/** Dansk label + ikon pr. logbogs-type (Fase 4). */
export const MAINT_TYPE_UI: Record<string, { label: string; icon: string }> = {
  service: { label: 'Service', icon: '🔧' },
  repair: { label: 'Reparation', icon: '🛠️' },
  inspection: { label: 'Eftersyn', icon: '🔍' },
  part_replaced: { label: 'Del udskiftet', icon: '⚙️' },
  note: { label: 'Note', icon: '📝' },
};

/** Kort dato (dansk). */
export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
