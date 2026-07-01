'use client';

/**
 * Maskinvælgeren fra det rigtige site:
 * "Skal vi hjælpe dig med sliddele? Vælg maskine: [ ... ] [FIND PRODUKTER]"
 * Henter maskiner og sender brugeren til den fitment-filtrerede produktside.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type MachineOption } from '@/lib/api';

export function MachinePicker() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineOption[]>([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    api
      .getMachines()
      .then(({ machines }) => setMachines(machines))
      .catch(() => setMachines([]));
  }, []);

  const find = () => {
    if (selected) router.push(`/products?machine_id=${selected}`);
  };

  return (
    <div className="border-b border-gray-200 bg-brand-bar">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium text-brand-green-dark">
          <span aria-hidden>🔍</span> Skal vi hjælpe dig med sliddele?
        </span>
        <label className="text-sm font-semibold text-gray-700">Vælg maskine:</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="min-w-[220px] flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none sm:flex-none"
        >
          <option value="">Vælg maskinmærke…</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.brand} {m.model} ({m.yearFrom}
              {m.yearTo ? `–${m.yearTo}` : '+'})
            </option>
          ))}
        </select>
        <button
          onClick={find}
          disabled={!selected}
          className="rounded bg-brand-green px-5 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Find produkter
        </button>
      </div>
    </div>
  );
}
