'use client';

/**
 * Fase 4 — vedligeholds-logbog for én maskine. Viser streak + serviceantal,
 * en tidslinje af poster og en hurtig "tilføj post"-formular.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { MaintenanceLog, MaintenanceType } from '@/lib/types';
import { MAINT_TYPE_UI, fmtDate, fmtHours } from '@/lib/gamify';

const TYPES: MaintenanceType[] = ['service', 'repair', 'inspection', 'part_replaced', 'note'];

export function LogbookPanel({ garageId }: { garageId: string }) {
  const [log, setLog] = useState<MaintenanceLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<MaintenanceType>('service');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getMaintenanceLog(garageId)
      .then((l) => !cancelled && setLog(l))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [garageId]);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const updated = await api.addMaintenanceLog(garageId, { type, title: title.trim() });
      setLog(updated);
      setTitle('');
      setAdding(false);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="px-4 py-3 text-sm text-gray-400">Henter logbog…</p>;
  if (!log) return null;

  return (
    <div className="px-4 py-3">
      {/* Nøgletal */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded bg-brand-bar px-2 py-0.5 font-medium text-gray-700">
          🔧 {log.serviceCount} services
        </span>
        {log.streak > 0 && (
          <span className="rounded bg-brand-green/15 px-2 py-0.5 font-medium text-brand-green-dark">
            🔥 {log.streak} på tid i træk
          </span>
        )}
        <button
          onClick={() => setAdding((v) => !v)}
          className="ml-auto text-xs font-semibold text-brand-red hover:underline"
        >
          {adding ? 'Fortryd' : '+ Tilføj post'}
        </button>
      </div>

      {/* Tilføj-formular */}
      {adding && (
        <div className="mb-3 flex flex-wrap items-end gap-2 rounded border border-gray-200 p-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MaintenanceType)}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {MAINT_TYPE_UI[t].label}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Beskrivelse…"
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-brand-green focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={busy || !title.trim()}
            className="rounded bg-brand-green px-3 py-1 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
          >
            Gem
          </button>
        </div>
      )}

      {/* Tidslinje */}
      {log.entries.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen poster endnu.</p>
      ) : (
        <ol className="space-y-2">
          {log.entries.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5">{MAINT_TYPE_UI[e.type].icon}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{e.title}</p>
                <p className="text-xs text-gray-400">
                  {MAINT_TYPE_UI[e.type].label}
                  {e.hours != null && ` · ${fmtHours(e.hours)}`} · {fmtDate(e.loggedAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
