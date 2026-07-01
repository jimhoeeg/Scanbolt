'use client';

/**
 * MODUL 3 — /dealer (Forhandler-portal). Den hurtige B2B-portal. På klienten
 * sender vi ikke-forhandlere væk; backend 403'er selvstændigt hvert
 * /api/dealer-kald, så data er sikre uanset hvad klienten viser.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { QuickOrderMatrix } from '@/components/dealer/QuickOrderMatrix';
import { CsvUploader } from '@/components/dealer/CsvUploader';
import { api } from '@/lib/api';
import type { OemLookupResult } from '@/lib/types';

export default function DealerPortalPage() {
  const { isDealer, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'quick' | 'csv'>('quick');

  useEffect(() => {
    if (!loading && !isDealer) router.replace('/');
  }, [loading, isDealer, router]);

  if (loading) return <p className="text-gray-500">Indlæser…</p>;
  if (!isDealer) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-gray-900">Forhandler-portal</h1>
        <p className="text-sm text-gray-500">
          Højvolumen-bestilling med live tier-priser, OEM-krydsreference og CSV-import.
        </p>
      </header>

      <OemLookupBar />

      {/* Faner */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['quick', 'csv'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 font-display text-sm font-medium uppercase tracking-wide ${
              tab === t
                ? 'border-brand-green text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'quick' ? 'Hurtig ordre' : 'CSV-masseupload'}
          </button>
        ))}
      </div>

      {tab === 'quick' ? (
        <QuickOrderMatrix onAddToCart={(lines) => console.log('læg i kurv', lines)} />
      ) : (
        <CsvUploader onImport={(rows) => console.log('importér rækker', rows)} />
      )}
    </div>
  );
}

/** Inline OEM-krydsreference — den hurtigste vej til et varenummer. */
function OemLookupBar() {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<OemLookupResult | null>(null);
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    if (!value.trim()) return;
    setBusy(true);
    try {
      setResult(await api.oemLookup(value.trim()));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <label className="mb-1 block font-display text-xs font-semibold uppercase tracking-wide text-gray-500">
        OEM-krydsreference
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder="Indtast producentens OEM-nummer (fx 227-6949)"
          className="flex-1 rounded border border-gray-300 px-3 py-2 font-mono focus:border-brand-green focus:outline-none"
        />
        <button
          onClick={lookup}
          disabled={busy}
          className="rounded bg-brand-dark px-4 py-2 font-display text-sm font-medium uppercase tracking-wide text-white hover:bg-black disabled:opacity-50"
        >
          {busy ? 'Slår op…' : 'Find varenr.'}
        </button>
      </div>

      {result && (
        <div className="mt-3 text-sm">
          {result.matched ? (
            <div className="flex flex-wrap items-center gap-3 rounded bg-brand-bar px-3 py-2">
              <span className="font-mono font-semibold text-gray-900">{result.sku}</span>
              <span className="text-gray-600">{result.title}</span>
              {result.manufacturer && (
                <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                  {result.manufacturer}
                </span>
              )}
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  result.inStock
                    ? 'bg-brand-green/15 text-brand-green-dark'
                    : 'bg-brand-red/10 text-brand-red'
                }`}
              >
                {result.inStock ? `På lager (${result.availableStock})` : 'Ikke på lager'}
              </span>
            </div>
          ) : (
            <p className="rounded bg-brand-red/5 px-3 py-2 text-brand-red">
              Intet varenummer fundet for “{result.oemNumber}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
