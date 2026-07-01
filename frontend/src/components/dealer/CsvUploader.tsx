'use client';

/**
 * MODUL 3 (frontend) — Træk-og-slip CSV-upload.
 * Modtager `sku,antal` eller `oem_nummer,antal`, sender til
 * /api/dealer/upload-csv og viser en per-række-tabel hvor ugyldige rækker
 * fremhæves (backend slår OEM-numre op til varenumre for os).
 */
import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { CsvRow } from '@/lib/types';

interface UploadResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: CsvRow[];
}

const ERR_DA: Record<string, string> = {
  'Missing SKU/OEM number': 'Mangler varenr./OEM-nr.',
  'Quantity must be a positive integer': 'Antal skal være et positivt heltal',
  'Quantity is not a number': 'Antal er ikke et tal',
  'SKU not found': 'Varenr. ikke fundet',
  'OEM number not found': 'OEM-nummer ikke fundet',
};

export function CsvUploader({ onImport }: { onImport?: (rows: CsvRow[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Upload venligst en .csv-fil.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.uploadCsv(file);
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const validRows = result?.rows.filter((r) => r.resolved) ?? [];

  return (
    <div className="space-y-4">
      {/* Drop-zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition ${
          dragging ? 'border-brand-green bg-brand-green/5' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <div className="mb-2 text-3xl text-gray-300">⇪</div>
        <p className="font-medium text-gray-700">
          {busy ? 'Behandler…' : 'Træk en CSV-fil hertil, eller klik for at vælge'}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Kolonner: <code className="font-mono">sku,antal</code> eller{' '}
          <code className="font-mono">oem_nummer,antal</code>
        </p>
      </div>

      {error && <p className="rounded bg-brand-red/5 px-3 py-2 text-sm text-brand-red">{error}</p>}

      {/* Resultat */}
      {result && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded bg-brand-green/15 px-2 py-0.5 font-medium text-brand-green-dark">
                {result.validCount} gyldige
              </span>
              {result.invalidCount > 0 && (
                <span className="rounded bg-brand-red/10 px-2 py-0.5 font-medium text-brand-red">
                  {result.invalidCount} ugyldige
                </span>
              )}
              <span className="text-gray-400">{result.totalRows} rækker i alt</span>
            </div>
            <button
              disabled={validRows.length === 0}
              onClick={() => onImport?.(validRows)}
              className="rounded bg-brand-green px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-green-dark disabled:opacity-40"
            >
              Importér {validRows.length} til kurv
            </button>
          </div>

          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm tabular">
              <thead className="sticky top-0 bg-brand-bar text-left font-display text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Linje</th>
                  <th className="px-2 py-2 font-semibold">Input</th>
                  <th className="px-2 py-2 font-semibold">Varenr.</th>
                  <th className="px-4 py-2 font-semibold">Beskrivelse</th>
                  <th className="w-16 px-2 py-2 text-right font-semibold">Antal</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr
                    key={row.line}
                    className={`border-b border-gray-50 ${row.resolved ? '' : 'bg-brand-red/5'}`}
                  >
                    <td className="px-4 py-1.5 text-gray-400">{row.line}</td>
                    <td className="px-2 py-1.5 font-mono text-gray-600">{row.identifier || '—'}</td>
                    <td className="px-2 py-1.5 font-mono text-gray-900">{row.sku ?? '—'}</td>
                    <td className="px-4 py-1.5 text-gray-600">{row.title ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right">{row.quantity || '—'}</td>
                    <td className="px-2 py-1.5">
                      {row.resolved ? (
                        <span className="rounded bg-brand-green/15 px-2 py-0.5 text-xs font-medium text-brand-green-dark">
                          OK{row.identifierType === 'oem_number' ? ' (OEM→varenr.)' : ''}
                        </span>
                      ) : (
                        <span className="rounded bg-brand-red/10 px-2 py-0.5 text-xs font-medium text-brand-red">
                          {ERR_DA[row.error ?? ''] ?? row.error ?? 'Ugyldig'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
