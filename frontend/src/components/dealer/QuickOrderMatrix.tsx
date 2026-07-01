'use client';

/**
 * MODUL 3 (frontend) — Hurtig-ordre-matrix.
 * Et tæt, tastaturvenligt grid hvor forhandlere taster varenumre + antal.
 * Rækker tilføjes dynamisk (når man skriver i sidste tomme række), og et
 * debouncet kald til /api/dealer/quick-order validerer lager + priser i
 * realtid for hver linje.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ResolvedLine } from '@/lib/types';

interface Row {
  id: string;
  sku: string;
  quantity: string;
}

let rowSeq = 0;
const newRow = (): Row => ({ id: `r${rowSeq++}`, sku: '', quantity: '' });

const kr = (n: number) => n.toLocaleString('da-DK', { minimumFractionDigits: 2 });

export function QuickOrderMatrix({ onAddToCart }: { onAddToCart?: (lines: ResolvedLine[]) => void }) {
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [resolved, setResolved] = useState<Record<string, ResolvedLine>>({});
  const [validating, setValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLines = useMemo(
    () =>
      rows
        .filter((r) => r.sku.trim() && Number(r.quantity) > 0)
        .map((r) => ({ sku: r.sku.trim(), quantity: Math.floor(Number(r.quantity)) })),
    [rows],
  );

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
        /* behold tidligere state ved forbigående fejl */
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
      const last = next[next.length - 1];
      if (last.sku.trim() || last.quantity.trim()) next.push(newRow());
      return next;
    });
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const grandTotal = useMemo(
    () => Object.values(resolved).reduce((sum, l) => (l.inStock ? sum + l.lineTotal : sum), 0),
    [resolved],
  );

  const validLines = useMemo(
    () => Object.values(resolved).filter((l) => l.inStock && !l.error),
    [resolved],
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="font-display font-bold uppercase tracking-wide text-gray-900">
          Hurtig ordre
        </h2>
        <span className="text-xs text-gray-400">{validating ? 'Validerer…' : 'Live priser'}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="border-b border-gray-100 bg-brand-bar text-left font-display text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2 font-semibold">Varenr.</th>
              <th className="w-24 px-2 py-2 font-semibold">Antal</th>
              <th className="px-4 py-2 font-semibold">Beskrivelse</th>
              <th className="px-2 py-2 text-right font-semibold">Stk. (netto)</th>
              <th className="px-2 py-2 text-right font-semibold">Rabat</th>
              <th className="px-2 py-2 text-right font-semibold">Linjetotal</th>
              <th className="px-2 py-2 font-semibold">Status</th>
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
                  className={`border-b border-gray-50 ${hasError ? 'bg-brand-red/5' : ''}`}
                >
                  <td className="px-4 py-1.5">
                    <input
                      value={row.sku}
                      onChange={(e) => updateRow(row.id, { sku: e.target.value.toUpperCase() })}
                      placeholder="fx FD-CAT-320D"
                      className="w-full rounded border border-gray-200 px-2 py-1.5 font-mono uppercase focus:border-brand-green focus:outline-none"
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
                      className="w-full rounded border border-gray-200 px-2 py-1.5 text-right focus:border-brand-green focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-1.5 text-gray-600">{r?.title ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right text-gray-700">
                    {r ? `${kr(r.netUnitPrice)} kr.` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-brand-green-dark">
                    {r && r.discountPct > 0 ? `-${r.discountPct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-gray-900">
                    {r?.inStock ? `${kr(r.lineTotal)} kr.` : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    {!r ? (
                      <span className="text-gray-300">—</span>
                    ) : r.error ? (
                      <span className="rounded bg-brand-red/10 px-2 py-0.5 text-xs font-medium text-brand-red">
                        {r.error === 'SKU not found' ? 'Varenr. ukendt' : r.error.replace('Only', 'Kun').replace('in stock', 'på lager')}
                      </span>
                    ) : (
                      <span className="rounded bg-brand-green/15 px-2 py-0.5 text-xs font-medium text-brand-green-dark">
                        På lager ({r.availableStock})
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {(row.sku || row.quantity) && (
                      <button
                        onClick={() => removeRow(row.id)}
                        className="text-gray-300 hover:text-brand-red"
                        aria-label="Fjern række"
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

      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
        <p className="text-sm text-gray-500">
          {validLines.length} linje{validLines.length === 1 ? '' : 'r'} klar
        </p>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Subtotal:{' '}
            <span className="font-display text-base font-bold text-gray-900">{kr(grandTotal)} kr.</span>
          </span>
          <button
            disabled={validLines.length === 0}
            onClick={() => onAddToCart?.(validLines)}
            className="rounded bg-brand-green px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Læg {validLines.length} i kurv
          </button>
        </div>
      </div>
    </div>
  );
}
