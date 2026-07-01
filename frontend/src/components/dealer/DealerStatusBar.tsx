'use client';

/**
 * Fase 3 — forhandler tier-progression + besparelses-tæller.
 * Viser nuværende niveau, hvor langt der er til næste (progressbar) og årets
 * samlede besparelse via forhandlerpriser. Aktiverer status + tab-aversion.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DealerStatus } from '@/lib/types';
import { fmtKr } from '@/lib/gamify';

const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Sølv',
  gold: 'Guld',
  platinum: 'Platin',
};
const TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;

export function DealerStatusBar() {
  const [status, setStatus] = useState<DealerStatus | null>(null);

  useEffect(() => {
    api.getDealerStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  const currentIdx = TIERS.indexOf(status.tier);

  return (
    <div className="grid gap-6 rounded-lg bg-brand-dark p-5 text-white sm:grid-cols-2 sm:items-center">
      {/* Tier + progression */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          {TIERS.map((t, i) => (
            <span
              key={t}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                t === status.tier
                  ? 'bg-yellow-500 text-brand-dark'
                  : i < currentIdx
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-gray-400'
              }`}
            >
              {TIER_LABEL[t]}
            </span>
          ))}
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-brand-green transition-all"
            style={{ width: `${status.progressPct}%` }}
          />
        </div>

        <p className="mt-2 text-sm text-gray-300">
          {status.nextTier && status.amountToNext != null ? (
            <>
              <span className="font-bold text-white">{fmtKr(status.amountToNext)}</span> mere i år, så
              låser du <span className="font-semibold text-yellow-400">{TIER_LABEL[status.nextTier]}</span> op.
            </>
          ) : (
            <span className="font-semibold text-yellow-400">Du er på højeste niveau 🏆</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">
          Forbrug i år: {fmtKr(status.ytdSpend)} · din rabat: {status.baseDiscount}%
        </p>
      </div>

      {/* Besparelses-tæller */}
      <div className="rounded-lg bg-white/5 p-4 text-center">
        <p className="font-display text-xs font-semibold uppercase tracking-wide text-gray-400">
          Sparet i år via forhandlerpriser
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-brand-green">{fmtKr(status.ytdSavings)}</p>
      </div>
    </div>
  );
}
