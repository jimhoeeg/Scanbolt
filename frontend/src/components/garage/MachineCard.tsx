'use client';

/**
 * MODULE 2 (frontend) — a single machine card.
 * For dealers it surfaces the fleet badge (customer name / job id) and a
 * "add parts to cart for this job" quick action.
 */
import type { GarageEntry } from '@/lib/types';

interface MachineCardProps {
  entry: GarageEntry;
  isDealer: boolean;
  onShopParts: (entry: GarageEntry) => void;
  onAddJobToCart?: (entry: GarageEntry) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  excavator: 'Excavator',
  mini_excavator: 'Mini excavator',
  wheel_loader: 'Wheel loader',
  bulldozer: 'Bulldozer',
  skid_steer: 'Skid steer',
  other: 'Machine',
};

export function MachineCard({ entry, isDealer, onShopParts, onAddJobToCart }: MachineCardProps) {
  const { machine } = entry;
  const years = machine.yearTo ? `${machine.yearFrom}–${machine.yearTo}` : `${machine.yearFrom}+`;

  return (
    <article className="flex flex-col rounded-lg border border-steel-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Header strip */}
      <div className="flex items-start justify-between border-b border-steel-100 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-steel-400">
            {CATEGORY_LABEL[machine.category] ?? machine.category}
          </p>
          <h3 className="mt-0.5 text-lg font-bold leading-tight text-steel-800">
            {machine.brand} {machine.model}
          </h3>
          <p className="text-sm text-steel-500">{years}</p>
        </div>
        {entry.nickname && (
          <span className="rounded bg-steel-100 px-2 py-1 text-xs text-steel-500">
            {entry.nickname}
          </span>
        )}
      </div>

      {/* Fleet metadata — dealers only */}
      {isDealer && (entry.customerName || entry.jobId) && (
        <div className="flex flex-wrap gap-2 border-b border-steel-100 bg-steel-50 p-3">
          {entry.customerName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-steel-800 px-2.5 py-1 text-xs font-medium text-white">
              <span className="text-safety-400">◆</span> {entry.customerName}
            </span>
          )}
          {entry.jobId && (
            <span className="inline-flex items-center gap-1 rounded-full border border-safety-500 px-2.5 py-1 text-xs font-mono font-medium text-safety-600">
              {entry.jobId}
            </span>
          )}
          {entry.serialNumber && (
            <span className="inline-flex items-center rounded-full bg-steel-100 px-2.5 py-1 text-xs font-mono text-steel-500">
              S/N {entry.serialNumber}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex gap-2 p-4">
        <button
          onClick={() => onShopParts(entry)}
          className="flex-1 rounded border border-steel-300 px-3 py-2 text-sm font-medium text-steel-700 hover:border-steel-400 hover:bg-steel-50"
        >
          Shop compatible parts
        </button>
        {isDealer && onAddJobToCart && (
          <button
            onClick={() => onAddJobToCart(entry)}
            className="flex-1 rounded bg-safety-500 px-3 py-2 text-sm font-semibold text-steel-900 hover:bg-safety-400"
          >
            Add parts to cart for this job
          </button>
        )}
      </div>
    </article>
  );
}
