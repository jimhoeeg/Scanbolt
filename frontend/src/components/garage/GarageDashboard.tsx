'use client';

/**
 * MODULE 2 (frontend) — My Garage dashboard.
 * Responsive grid of saved machines. Adapts its heading + card actions based
 * on whether the signed-in user is a dealer (fleet) or a standard buyer.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { GarageEntry } from '@/lib/types';
import { MachineCard } from './MachineCard';

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
    // Navigate to the fitment-filtered catalog for this machine.
    // router.push respects Next's basePath (needed on GitHub Pages).
    router.push(`/products?machine_id=${entry.machine.id}`);
  };

  const handleAddJobToCart = async (entry: GarageEntry) => {
    // Pull compatible parts and drop them into the cart tagged with this job.
    const { parts } = await api.getProductsForMachine(entry.machine.id);
    // In a full build this would push to a cart store; here we confirm intent.
    alert(
      `Added ${parts.length} compatible part(s) to cart for ${entry.customerName ?? 'this job'}` +
        (entry.jobId ? ` (${entry.jobId})` : ''),
    );
  };

  if (!isAuthenticated) {
    return <p className="text-steel-500">Sign in to view your garage.</p>;
  }
  if (loading) return <GarageSkeleton />;
  if (error) return <p className="text-red-600">Could not load garage: {error}</p>;

  return (
    <section>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-steel-800">
            {isDealer ? 'Fleet Garage' : 'My Garage'}
          </h1>
          <p className="text-sm text-steel-500">
            {isDealer
              ? 'Machines you manage on behalf of your customers. Order parts against a job in one click.'
              : 'Your saved machines. We only show parts that fit them.'}
          </p>
        </div>
        <span className="rounded bg-steel-100 px-3 py-1 text-sm text-steel-500">
          {entries.length} machine{entries.length === 1 ? '' : 's'}
        </span>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-steel-300 p-10 text-center text-steel-500">
          No machines saved yet.
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
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GarageSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg bg-steel-100" />
      ))}
    </div>
  );
}
