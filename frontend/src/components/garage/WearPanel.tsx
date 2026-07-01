'use client';

/**
 * Fase 2 — slid & restlevetid for én maskine. Henter komponent-slid og viser
 * bjælker + "skift"-CTA. Estimatet bygger på maskinens timetal (Fase 1).
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { WearComponent } from '@/lib/types';
import { fmtHours, wearColor } from '@/lib/gamify';

interface WearPanelProps {
  garageId: string;
  onShop: (sku: string) => void;
}

export function WearPanel({ garageId, onShop }: WearPanelProps) {
  const [components, setComponents] = useState<WearComponent[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getWear(garageId)
      .then((res) => {
        if (!cancelled) setComponents(res.components);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [garageId]);

  if (loading) return <p className="px-4 py-3 text-sm text-gray-400">Beregner slid…</p>;
  if (!components || components.length === 0) {
    return <p className="px-4 py-3 text-sm text-gray-400">Ingen slid-sporede dele på denne maskine.</p>;
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <p className="text-xs text-gray-400">Estimeret ud fra maskinens timetal.</p>
      {components.map((c) => (
        <div key={c.sku}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-800">{c.title}</span>
            <span className={`font-semibold ${c.wearPct >= 90 ? 'text-brand-red' : 'text-gray-700'}`}>
              {c.wearPct}% slidt
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full ${wearColor(c.wearPct)}`} style={{ width: `${c.wearPct}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>
              {c.remainingHours > 0 ? `~${fmtHours(c.remainingHours)} tilbage` : 'Anbefalet udskiftning nu'}
            </span>
            <button
              onClick={() => onShop(c.sku)}
              className="font-semibold text-brand-red hover:underline"
            >
              {c.wearPct >= 90 ? 'Skift nu' : 'Se del'} →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
