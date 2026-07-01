'use client';

/**
 * MODUL 2 (frontend) — Min Garage / Flåde-garage.
 * Responsivt grid af gemte maskiner. Tilpasser overskrift + kort-handlinger
 * efter om den indloggede bruger er forhandler (flåde) eller privatkunde.
 * Deler samtidig relevant fagviden via en faktaboks.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { GarageEntry } from '@/lib/types';
import { MachineCard } from './MachineCard';
import { FactBox } from '@/components/FactBox';
import { KNOWLEDGE } from '@/lib/knowledge';
import { ProgressHeader } from './ProgressHeader';
import { MilestoneStrip } from './MilestoneStrip';

export function GarageDashboard() {
  const { isDealer, isAuthenticated } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<GarageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { entries } = await api.getGarage();
        if (!cancelled) setEntries(entries);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleShopParts = (entry: GarageEntry) => {
    // router.push respekterer Next's basePath (nødvendigt på GitHub Pages).
    router.push(`/products?machine_id=${entry.machine.id}`);
  };

  const handleAddJobToCart = async (entry: GarageEntry) => {
    const { parts } = await api.getProductsForMachine(entry.machine.id);
    alert(
      `Lagde ${parts.length} passende del(e) i kurven til ${entry.customerName ?? 'opgaven'}` +
        (entry.jobId ? ` (${entry.jobId})` : ''),
    );
  };

  // Fase 1 — opdatér en enkelt maskine i state efter timer/service.
  const replaceEntry = (updated: GarageEntry) =>
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));

  const handleUpdateHours = async (garageId: string, currentHours: number) => {
    const { entry } = await api.updateHours(garageId, currentHours);
    replaceEntry(entry);
  };

  const handleMarkServiced = async (garageId: string) => {
    const { entry } = await api.markServiced(garageId);
    replaceEntry(entry);
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
        <p className="text-gray-500">Log ind for at se din garage.</p>
      </div>
    );
  }
  if (loading) return <GarageSkeleton />;
  if (error) return <p className="text-brand-red">Kunne ikke hente garagen: {error}</p>;

  return (
    <section className="space-y-6">
      {/* Fase 5 — XP/niveau + Fase 4 — milepæle */}
      <ProgressHeader />
      <MilestoneStrip />

      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            {isDealer ? 'Flåde-garage' : 'Min Garage'}
          </h1>
          <p className="text-sm text-gray-500">
            {isDealer
              ? 'Maskiner du håndterer for dine kunder. Bestil dele til en opgave med ét klik.'
              : 'Dine gemte maskiner. Vi viser kun dele der passer til dem.'}
          </p>
        </div>
        <span className="rounded bg-brand-bar px-3 py-1 text-sm text-gray-500">
          {entries.length} maskine{entries.length === 1 ? '' : 'r'}
        </span>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
          Ingen maskiner gemt endnu.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <MachineCard
              key={entry.id}
              entry={entry}
              isDealer={isDealer}
              onShopParts={handleShopParts}
              onAddJobToCart={handleAddJobToCart}
              onUpdateHours={handleUpdateHours}
              onMarkServiced={handleMarkServiced}
            />
          ))}
        </div>
      )}

      {/* Vidensdeling i konteksten */}
      <div className="mt-8">
        <FactBox article={KNOWLEDGE[0]} />
      </div>
    </section>
  );
}

function GarageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}
