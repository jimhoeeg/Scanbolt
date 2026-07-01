'use client';

/**
 * MODULE 3 — /dealer route. The high-speed B2B portal. Client-side we redirect
 * non-dealers away; the backend independently 403s every /api/dealer call, so
 * the data is safe regardless of what the client renders.
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

  if (loading) return <p className="text-steel-500">Loading…</p>;
  if (!isDealer) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-steel-800">Dealer Portal</h1>
        <p className="text-sm text-steel-500">
          High-volume ordering with live tier pricing, OEM cross-referencing and CSV import.
        </p>
      </header>

      <OemLookupBar />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-steel-200">
        {(['quick', 'csv'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t
                ? 'border-safety-500 text-steel-800'
                : 'border-transparent text-steel-400 hover:text-steel-600'
            }`}
          >
            {t === 'quick' ? 'Quick Order Matrix' : 'CSV Bulk Upload'}
          </button>
        ))}
      </div>

      {tab === 'quick' ? (
        <QuickOrderMatrix onAddToCart={(lines) => console.log('add to cart', lines)} />
      ) : (
        <CsvUploader onImport={(rows) => console.log('import rows', rows)} />
      )}
    </div>
  );
}

/** Inline OEM cross-reference lookup — the fastest path to a SKU. */
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
    <div className="rounded-lg border border-steel-200 bg-white p-4">
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-steel-400">
        OEM cross-reference
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder="Enter manufacturer OEM number (e.g. 227-6949)"
          className="flex-1 rounded border border-steel-300 px-3 py-2 font-mono focus:border-safety-500 focus:outline-none"
        />
        <button
          onClick={lookup}
          disabled={busy}
          className="rounded bg-steel-800 px-4 py-2 text-sm font-medium text-white hover:bg-steel-700 disabled:opacity-50"
        >
          {busy ? 'Looking up…' : 'Find SKU'}
        </button>
      </div>

      {result && (
        <div className="mt-3 text-sm">
          {result.matched ? (
            <div className="flex flex-wrap items-center gap-3 rounded bg-steel-50 px-3 py-2">
              <span className="font-mono font-semibold text-steel-800">{result.sku}</span>
              <span className="text-steel-600">{result.title}</span>
              {result.manufacturer && (
                <span className="rounded bg-steel-200 px-2 py-0.5 text-xs text-steel-600">
                  {result.manufacturer}
                </span>
              )}
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  result.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {result.inStock ? `In stock (${result.availableStock})` : 'Out of stock'}
              </span>
            </div>
          ) : (
            <p className="rounded bg-red-50 px-3 py-2 text-red-700">
              No internal SKU found for “{result.oemNumber}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
