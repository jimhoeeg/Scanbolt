/**
 * GAMIFICATION — ren beregningslogik for sundhedsscore (Fase 1) og
 * slid-estimat (Fase 2). Holdt fri for DB/HTTP, så den kan genbruges og
 * er let at teste. Spejlet i frontend/src/lib/gamify.ts.
 */
import { HealthStatus } from '../../types';

export const DEFAULT_SERVICE_INTERVAL = 500;

/**
 * Sundhedsscore 0–100: 100 lige efter service, faldende mod 0 når timer
 * siden service nærmer sig serviceintervallet.
 */
export function healthScore(
  currentHours: number,
  lastServiceHours: number,
  intervalHours: number,
): number {
  const since = Math.max(0, currentHours - lastServiceHours);
  const interval = intervalHours > 0 ? intervalHours : DEFAULT_SERVICE_INTERVAL;
  const pct = Math.min(1, since / interval);
  return Math.round(100 * (1 - pct));
}

/** Oversætter score til en status. `hasData` er falsk før timetal er logget. */
export function healthStatus(score: number, hasData: boolean): HealthStatus {
  if (!hasData) return 'unknown';
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'due_soon';
  return 'overdue';
}

/** Slid i procent ud fra maskinens timetal vs. delens forventede levetid. */
export function wearPct(currentHours: number, wearLifeHours: number): number {
  if (wearLifeHours <= 0) return 0;
  return Math.min(100, Math.round((currentHours / wearLifeHours) * 100));
}

/** Estimeret restlevetid i driftstimer. */
export function remainingHours(currentHours: number, wearLifeHours: number): number {
  return Math.max(0, wearLifeHours - currentHours);
}
