/**
 * GAMIFICATION Fase 5 — XP / niveau-system.
 * Et let ledger: handlinger giver point, og brugerens rang afledes af summen.
 * `awardXp` kaldes af andre moduler (garage, checkout); `trackAction` er den
 * bruger-udløste variant (fx læs guide).
 */
import { query, queryOne } from '../../db/pool';
import { UserProgress } from '../../types';

/** Pointværdi pr. handling. */
export const XP_VALUES: Record<string, number> = {
  machine_added: 50,
  hours_logged: 10,
  service_logged: 40,
  log_added: 20,
  guide_read: 15,
  order_placed: 30,
};

/** Handlinger der kun tæller én gang pr. `ref` (kræver ref). */
const ONCE_ACTIONS = new Set(['guide_read']);

/** Handlinger brugeren selv må udløse via /track. */
const USER_TRACKABLE = new Set(['guide_read']);

/** Rang-trin (dansk). */
export const RANKS = [
  { key: 'laerling', label: 'Lærling', minXp: 0 },
  { key: 'mekaniker', label: 'Mekaniker', minXp: 100 },
  { key: 'formand', label: 'Formand', minXp: 300 },
  { key: 'mester', label: 'Mestermekaniker', minXp: 700 },
  { key: 'vaerkfoerer', label: 'Værkfører', minXp: 1500 },
];

/**
 * Tildel XP for en handling. Fejler blødt (logger ikke fatalt) så et manglende
 * XP-event aldrig vælter den egentlige forretningshandling.
 */
export async function awardXp(userId: string, action: string, ref: string | null = null): Promise<void> {
  const points = XP_VALUES[action];
  if (!points) return;
  try {
    if (ONCE_ACTIONS.has(action)) {
      await query(
        `INSERT INTO xp_events (user_id, action, points, ref)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, action, ref) DO NOTHING`,
        [userId, action, points, ref],
      );
    } else {
      await query(
        `INSERT INTO xp_events (user_id, action, points, ref) VALUES ($1, $2, $3, $4)`,
        [userId, action, points, ref],
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('awardXp failed', err);
  }
}

/** Beregn brugerens samlede progression. */
export async function getProgress(userId: string): Promise<UserProgress> {
  const sumRow = await queryOne<{ xp: string }>(
    `SELECT COALESCE(SUM(points), 0) AS xp FROM xp_events WHERE user_id = $1`,
    [userId],
  );
  const xp = Number(sumRow?.xp ?? 0);

  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].minXp) idx = i;
  const rank = RANKS[idx];
  const next = RANKS[idx + 1] ?? null;
  const xpToNext = next ? Math.max(0, next.minXp - xp) : 0;
  const progressPct = next
    ? Math.min(100, Math.round(((xp - rank.minXp) / (next.minXp - rank.minXp)) * 100))
    : 100;

  const recent = await query<{ action: string; points: number; ref: string | null; created_at: string }>(
    `SELECT action, points, ref, created_at FROM xp_events
      WHERE user_id = $1 ORDER BY created_at DESC LIMIT 8`,
    [userId],
  );

  return {
    xp,
    rank: rank.label,
    rankKey: rank.key,
    nextRank: next?.label ?? null,
    xpToNext,
    progressPct,
    recent: recent.map((r) => ({
      action: r.action,
      points: r.points,
      ref: r.ref,
      createdAt: r.created_at,
    })),
  };
}

/** Bruger-udløst XP (whitelisted). Returnerer opdateret progression. */
export async function trackAction(
  userId: string,
  action: string,
  ref: string | null,
): Promise<UserProgress> {
  if (USER_TRACKABLE.has(action)) {
    await awardXp(userId, action, ref);
  }
  return getProgress(userId);
}
