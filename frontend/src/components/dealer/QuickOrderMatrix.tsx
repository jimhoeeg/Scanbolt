'use client';

/**
 * MODULE 3 (frontend) — Quick Order Matrix.
 * A dense, keyboard-friendly grid where dealers type SKUs + quantities.
 * Rows are added dynamically (typing in the last empty row spawns a new one),
 * and a debounced call to /api/dealer/quick-order validates stock + prices
 * every line in real time.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ResolvedLine } from '@/lib/types';

interface Row {
  id: string;
  sku: string;
  quantity: string; // kept as string for controlled input
}

let rowSeq = 0;
const newRow = (): Row => ({ id: `r${rowSeq++}`, sku: '', quantity: '' });

export function QuickOrderMatrix({ onAddToCart }: { onAddToCart?: (lines: ResolvedLine[]) => void }) {
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [resolved, setResolved] = useState<Record<string, ResolvedLine>>({});
  const [validating, setValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lines that actually have a SKU + positive quantity.
  const activeLines = useMemo(
    () =>
      rows
        .filter((r) => r.sku.trim() && Number(r.quantity) > 0)
        .map((r) => ({ sku: r.sku.trim(), quantity: Math.floor(Number(r.quantity)) })),
    [rows],
  );

  // Debounced real-time validation/pricing.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (activeLines.length === 0) {
      setResolved({});
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setValidating(true);
      try {
        const { items } = await api.quickOrder(activeLines);
        const map: Record<string, ResolvedLine> = {};
        for (const item of items) map[item.sku] = item;
        setResolved(map);
      } catch {
        /* leave previous state; a transient error shouldn't clear the grid */
      } finally {
        setValidating(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeLines]);

  const updateRow = useCallback((id: string, patch: Partial<Row>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      // Auto-append a fresh row when the user starts filling the last one.
      const last = next[next.length - 1];
      if (last.sku.trim() || last.quantity.trim()) next.push(newRow());
      return next;
    });
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const grandTotal = useMemo(
    () =>
      Object.values(resolved).reduce((sum, l) => (l.inStock ? sum + l.lineTotal : sum), 0),
    [resolved],
  );

  const validLines = useMemo(
    () => Object.values(resolved).filter((l) => l.inStock && !l.error),
    [resolved],
  );

  return (
    <div className="rounded-lg border border-steel-200 bg-white">
      <div className="flex items-center justify-between border-b border-steel-100 px-4 py-3">
        <h2 className="font-bold text-steel-800">Quick Order Matrix</h2>
        <span className="text-xs text-steel-400">{validating ? 'Validating…' : 'Live pricing'}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="border-b border-steel-100 bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-400">
              <th className="px-4 py-2 font-medium">SKU</th>
              <th className="w-24 px-2 py-2 font-medium">Qty</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-2 py-2 text-right font-medium">Unit (net)</th>
              <th className="px-2 py-2 text-right font-medium">Disc.</th>
              <th className="px-2 py-2 text-right font-medium">Line total</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const r = resolved[row.sku.trim()];
              const hasError = r?.error;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-steel-50 ${hasError ? 'bg-red-50' : ''}`}
                >
                  <td className="px-4 py-1.5">
                    <input
                      value={row.sku}
                      onChange={(e) => updateRow(row.id, { sku: e.target.value.toUpperCase() })}
                      placeholder="e.g. FD-CAT-320D"
                      className="w-full rounded border border-steel-200 px-2 py-1.5 font-mono uppercase focus:border-safety-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={row.quantity}
                      onChange={(e) =>
                        updateRow(row.id, { quantity: e.target.value.replace(/[^0-9]/g, '') })
                      }
                      inputMode="numeric"
                      placeholder="0"
                      className="w-full rounded border border-steel-200 px-2 py-1.5 text-right focus:border-safety-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-1.5 text-steel-600">{r?.title ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right text-steel-700">
                    {r ? `$${r.netUnitPrice.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-safety-600">
                    {r && r.discountPct > 0 ? `-${r.discountPct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-steel-800">
                    {r?.inStock ? `$${r.lineTotal.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    {!r ? (
                      <span className="text-steel-300">—</span>
                    ) : r.error ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {r.error}
                      </span>
                    ) : (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        In stock ({r.availableStock})
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {(row.sku || row.quantity) && (
                      <button
                        onClick={() => removeRow(row.id)}
                        className="text-steel-300 hover:text-red-500"
                        aria-label="Remove row"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-steel-100 px-4 py-3">
        <p className="text-sm text-steel-500">
          {validLines.length} line{validLines.length === 1 ? '' : 's'} ready
        </p>
        <div className="flex items-center gap-4">
          <span className="text-sm text-steel-500">
            Subtotal:{' '}
            <span className="text-base font-bold text-steel-800">${grandTotal.toFixed(2)}</span>
          </span>
          <button
            disabled={validLines.length === 0}
            onClick={() => onAddToCart?.(validLines)}
            className="rounded bg-safety-500 px-4 py-2 text-sm font-semibold text-steel-900 hover:bg-safety-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add {validLines.length} to cart
          </button>
        </div>
      </div>
    </div>
  );
}
