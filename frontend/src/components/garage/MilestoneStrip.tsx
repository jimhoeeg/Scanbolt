'use client';

/**
 * Fase 4 — milepæle. En stribe achievement-badges der låses op efterhånden
 * som brugeren bruger garagen (tilføj maskine, log timer, servicér, læs viden).
 * Opdaterer live via 'scanbolt:progress'.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { GarageSummary } from '@/lib/types';

export function MilestoneStrip() {
  const [summary, setSummary] = useState<GarageSummary | null>(null);

  const load = useCallback(() => {
    api.getSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener('scanbolt:progress', load);
    return () => window.removeEventListener('scanbolt:progress', load);
  }, [load]);

  if (!summary) return null;

  const unlockedCount = summary.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-gray-700">Milepæle</h2>
        <span className="text-xs text-gray-400">
          {unlockedCount} / {summary.achievements.length} låst op
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {summary.achievements.map((a) => (
          <div
            key={a.key}
            title={a.description}
            className={`flex flex-col items-center rounded-lg border p-3 text-center transition ${
              a.unlocked ? 'border-brand-green/40 bg-brand-green/5' : 'border-gray-200 bg-gray-50 opacity-60'
            }`}
          >
            <span className={`text-2xl ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
            <span className="mt-1 text-xs font-semibold text-gray-800">{a.label}</span>
            {a.unlocked ? (
              <span className="mt-0.5 text-[10px] font-medium text-brand-green-dark">Låst op ✓</span>
            ) : (
              <span className="mt-0.5 text-[10px] text-gray-400">Låst</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
