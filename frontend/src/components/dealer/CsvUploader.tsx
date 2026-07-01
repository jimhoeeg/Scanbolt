'use client';

/**
 * MODULE 3 (frontend) — Drag-and-drop CSV uploader.
 * Accepts `sku,quantity` or `oem_number,quantity` files, posts to
 * /api/dealer/upload-csv, then renders a per-row result table with invalid
 * rows highlighted (the backend resolves OEM numbers to SKUs for us).
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

export function CsvUploader({ onImport }: { onImport?: (rows: CsvRow[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.');
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
      {/* Drop zone */}
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
          dragging
            ? 'border-safety-500 bg-safety-400/10'
            : 'border-steel-300 bg-white hover:border-steel-400'
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
        <div className="mb-2 text-3xl text-steel-300">⇪</div>
        <p className="font-medium text-steel-700">
          {busy ? 'Parsing…' : 'Drag & drop a CSV, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-steel-400">
          Columns: <code className="font-mono">sku,quantity</code> or{' '}
          <code className="font-mono">oem_number,quantity</code>
        </p>
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Result summary + per-row table */}
      {result && (
        <div className="rounded-lg border border-steel-200 bg-white">
          <div className="flex items-center justify-between border-b border-steel-100 px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded bg-green-100 px-2 py-0.5 font-medium text-green-700">
                {result.validCount} valid
              </span>
              {result.invalidCount > 0 && (
                <span className="rounded bg-red-100 px-2 py-0.5 font-medium text-red-700">
                  {result.invalidCount} invalid
                </span>
              )}
              <span className="text-steel-400">{result.totalRows} rows total</span>
            </div>
            <button
              disabled={validRows.length === 0}
              onClick={() => onImport?.(validRows)}
              className="rounded bg-safety-500 px-3 py-1.5 text-sm font-semibold text-steel-900 hover:bg-safety-400 disabled:opacity-40"
            >
              Import {validRows.length} to cart
            </button>
          </div>

          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm tabular">
              <thead className="sticky top-0 bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Line</th>
                  <th className="px-2 py-2 font-medium">Input</th>
                  <th className="px-2 py-2 font-medium">Resolved SKU</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="w-16 px-2 py-2 text-right font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr
                    key={row.line}
                    className={`border-b border-steel-50 ${row.resolved ? '' : 'bg-red-50'}`}
                  >
                    <td className="px-4 py-1.5 text-steel-400">{row.line}</td>
                    <td className="px-2 py-1.5 font-mono text-steel-600">{row.identifier || '—'}</td>
                    <td className="px-2 py-1.5 font-mono text-steel-800">{row.sku ?? '—'}</td>
                    <td className="px-4 py-1.5 text-steel-600">{row.title ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right">{row.quantity || '—'}</td>
                    <td className="px-2 py-1.5">
                      {row.resolved ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          OK{row.identifierType === 'oem_number' ? ' (OEM→SKU)' : ''}
                        </span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          {row.error ?? 'Invalid'}
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
