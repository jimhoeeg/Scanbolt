'use client';

/**
 * MODUL 2 (frontend) — enkelt maskinkort.
 * For forhandlere vises flåde-badge (kundenavn / job-id) og en hurtig
 * "læg dele i kurv til denne opgave"-knap.
 */
import type { GarageEntry } from '@/lib/types';

interface MachineCardProps {
  entry: GarageEntry;
  isDealer: boolean;
  onShopParts: (entry: GarageEntry) => void;
  onAddJobToCart?: (entry: GarageEntry) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  excavator: 'Gravemaskine',
  mini_excavator: 'Minigraver',
  wheel_loader: 'Gummiged',
  bulldozer: 'Bulldozer',
  skid_steer: 'Kompaktlæsser',
  other: 'Maskine',
};

export function MachineCard({ entry, isDealer, onShopParts, onAddJobToCart }: MachineCardProps) {
  const { machine } = entry;
  const years = machine.yearTo ? `${machine.yearFrom}–${machine.yearTo}` : `${machine.yearFrom}+`;

  return (
    <article className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Hoved */}
      <div className="flex items-start justify-between border-b border-gray-100 p-4">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-wide text-gray-400">
            {CATEGORY_LABEL[machine.category] ?? machine.category}
          </p>
          <h3 className="mt-0.5 font-display text-lg font-bold leading-tight text-gray-900">
            {machine.brand} {machine.model}
          </h3>
          <p className="text-sm text-gray-500">Årgang {years}</p>
        </div>
        {entry.nickname && (
          <span className="rounded bg-brand-bar px-2 py-1 text-xs text-gray-500">
            {entry.nickname}
          </span>
        )}
      </div>

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
