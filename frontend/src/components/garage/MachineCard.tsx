'use client';

/**
 * MODUL 2 + GAMIFICATION — maskinkort.
 * Fase 1: sundheds-ring, status og driftstimer (opdater / marker serviceret).
 * Fase 2: værste sliddel som badge + udfoldelig slid-oversigt.
 * Forhandlere ser desuden flåde-badge og "læg i kurv til opgaven".
 */
import { useState } from 'react';
import type { GarageEntry } from '@/lib/types';
import { HEALTH_UI, fmtHours } from '@/lib/gamify';
import { HealthRing } from './HealthRing';
import { WearPanel } from './WearPanel';

interface MachineCardProps {
  entry: GarageEntry;
  isDealer: boolean;
  onShopParts: (entry: GarageEntry) => void;
  onAddJobToCart?: (entry: GarageEntry) => void;
  onUpdateHours: (garageId: string, currentHours: number) => Promise<void>;
  onMarkServiced: (garageId: string) => Promise<void>;
}

const CATEGORY_LABEL: Record<string, string> = {
  excavator: 'Gravemaskine',
  mini_excavator: 'Minigraver',
  wheel_loader: 'Gummiged',
  bulldozer: 'Bulldozer',
  skid_steer: 'Kompaktlæsser',
  other: 'Maskine',
};

export function MachineCard({
  entry,
  isDealer,
  onShopParts,
  onAddJobToCart,
  onUpdateHours,
  onMarkServiced,
}: MachineCardProps) {
  const { machine } = entry;
  const years = machine.yearTo ? `${machine.yearFrom}–${machine.yearTo}` : `${machine.yearFrom}+`;
  const ui = HEALTH_UI[entry.healthStatus];

  const [editingHours, setEditingHours] = useState(false);
  const [hoursInput, setHoursInput] = useState(String(entry.currentHours ?? ''));
  const [showWear, setShowWear] = useState(false);
  const [busy, setBusy] = useState(false);

  const saveHours = async () => {
    const n = Number(hoursInput);
    if (!Number.isFinite(n) || n < 0) return;
    setBusy(true);
    try {
      await onUpdateHours(entry.id, Math.floor(n));
      setEditingHours(false);
    } finally {
      setBusy(false);
    }
  };

  const service = async () => {
    setBusy(true);
    try {
      await onMarkServiced(entry.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Hoved med sundheds-ring */}
      <div className="flex items-start gap-3 border-b border-gray-100 p-4">
        <HealthRing score={entry.healthScore} status={entry.healthStatus} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-semibold uppercase tracking-wide text-gray-400">
            {CATEGORY_LABEL[machine.category] ?? machine.category}
          </p>
          <h3 className="mt-0.5 truncate font-display text-lg font-bold leading-tight text-gray-900">
            {machine.brand} {machine.model}
          </h3>
          <p className="text-sm text-gray-500">Årgang {years}</p>
          <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${ui.bg} ${ui.text}`}>
            {ui.label}
          </span>
        </div>
        {entry.nickname && (
          <span className="rounded bg-brand-bar px-2 py-1 text-xs text-gray-500">{entry.nickname}</span>
        )}
      </div>

      {/* Fase 1 — driftstimer & service */}
      <div className="border-b border-gray-100 px-4 py-3">
        {entry.currentHours != null && entry.hoursSinceService != null ? (
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{fmtHours(entry.currentHours)}</span> ·{' '}
            {fmtHours(entry.hoursSinceService)} siden service{' '}
            <span className="text-gray-400">(interval {fmtHours(entry.serviceIntervalHours)})</span>
          </p>
        ) : (
          <p className="text-sm text-amber-600">Tilføj timetal for at få en sundhedsscore.</p>
        )}

        {editingHours ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={hoursInput}
              onChange={(e) => setHoursInput(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="Aktuelt timetal"
              className="w-32 rounded border border-gray-300 px-2 py-1 text-sm focus:border-brand-green focus:outline-none"
            />
            <button
              onClick={saveHours}
              disabled={busy}
              className="rounded bg-brand-green px-3 py-1 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
            >
              Gem
            </button>
            <button onClick={() => setEditingHours(false)} className="text-sm text-gray-400 hover:text-gray-600">
              Fortryd
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <button
              onClick={() => {
                setHoursInput(String(entry.currentHours ?? ''));
                setEditingHours(true);
              }}
              className="font-semibold text-brand-red hover:underline"
            >
              Opdater timetal
            </button>
            {entry.currentHours != null && (
              <button onClick={service} disabled={busy} className="text-gray-500 hover:text-gray-800 hover:underline">
                Marker som serviceret
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fase 2 — værste sliddel + udfoldelig oversigt */}
      {entry.topWear && (
        <div className="border-b border-gray-100">
          <button
            onClick={() => setShowWear((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50"
          >
            <span className="text-sm">
              <span className="text-gray-500">Mest slidt:</span>{' '}
              <span className="font-semibold text-gray-900">{entry.topWear.title}</span>{' '}
              <span className={entry.topWear.wearPct >= 90 ? 'font-bold text-brand-red' : 'text-gray-600'}>
                {entry.topWear.wearPct}%
              </span>
            </span>
            <span className="text-xs text-brand-red">{showWear ? 'Skjul' : 'Se slid'}</span>
          </button>
          {showWear && <WearPanel garageId={entry.id} onShop={() => onShopParts(entry)} />}
        </div>
      )}

      {/* Flåde-metadata — kun forhandlere */}
      {isDealer && (entry.customerName || entry.jobId) && (
        <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-brand-bar p-3">
          {entry.customerName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-dark px-2.5 py-1 text-xs font-medium text-white">
              <span className="text-brand-green">◆</span> {entry.customerName}
            </span>
          )}
          {entry.jobId && (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-red px-2.5 py-1 font-mono text-xs font-medium text-brand-red">
              {entry.jobId}
            </span>
          )}
          {entry.serialNumber && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-500">
              Stelnr. {entry.serialNumber}
            </span>
          )}
        </div>
      )}

      {/* Handlinger */}
      <div className="mt-auto flex gap-2 p-4">
        <button
          onClick={() => onShopParts(entry)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
        >
          Vis passende dele
        </button>
        {isDealer && onAddJobToCart && (
          <button
            onClick={() => onAddJobToCart(entry)}
            className="flex-1 rounded bg-brand-green px-3 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
          >
            Læg dele i kurv til opgaven
          </button>
        )}
      </div>
    </article>
  );
}
