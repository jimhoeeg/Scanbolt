'use client';

/**
 * Fase 5 — XP / niveau-header. Viser brugerens rang, XP-bar og hvor langt der
 * er til næste rang. Lytter på 'scanbolt:progress', så baren opdaterer live når
 * man logger timer, servicerer eller læser en guide.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { UserProgress } from '@/lib/types';
import { RANK_ICON, XP_ACTION_LABEL } from '@/lib/gamify';

export function ProgressHeader() {
  const [p, setP] = useState<UserProgress | null>(null);

  const load = useCallback(() => {
    api.getProgress().then(setP).catch(() => setP(null));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('scanbolt:progress', load);
    return () => window.removeEventListener('scanbolt:progress', load);
  }, [load]);

  if (!p) return null;

  return (
    <div className="rounded-lg bg-brand-dark p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl">
            {RANK_ICON[p.rankKey] ?? '🔧'}
          </span>
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-wide text-gray-400">
              Dit niveau
            </p>
            <p className="font-display text-xl font-bold">{p.rank}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-brand-green">{p.xp} XP</p>
          {p.nextRank && (
            <p className="text-xs text-gray-400">
              {p.xpToNext} XP til <span className="font-semibold text-white">{p.nextRank}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${p.progressPct}%` }} />
      </div>

      {p.recent.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          Senest: {XP_ACTION_LABEL[p.recent[0].action] ?? p.recent[0].action}{' '}
          <span className="text-brand-green">+{p.recent[0].points} XP</span>
        </p>
      )}
    </div>
  );
}
