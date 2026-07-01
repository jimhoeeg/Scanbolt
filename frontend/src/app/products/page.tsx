'use client';

/**
 * MODULE 2 — /products?machine_id=XYZ
 * Fitment-filtered catalog for a single machine. Reached from the "Shop
 * compatible parts" action in My Garage. useSearchParams must live inside a
 * Suspense boundary for the static export build.
 */
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface CatalogPart {
  sku: string;
  title: string;
  price: number;
  stock?: number;
  stockQty?: number;
}

function ProductsInner() {
  const params = useSearchParams();
  const machineId = params.get('machine_id') ?? '';
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!machineId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { parts } = await api.getProductsForMachine(machineId);
        setParts(parts as CatalogPart[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [machineId]);

  if (!machineId) return <p className="text-steel-500">No machine selected.</p>;
  if (loading) return <p className="text-steel-500">Loading compatible parts…</p>;

  return (
    <section>
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-steel-800">Compatible parts</h1>
        <p className="text-sm text-steel-500">
          Only parts verified to fit this machine ({parts.length} found).
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {parts.map((p) => (
          <article key={p.sku} className="rounded-lg border border-steel-200 bg-white p-4">
            <p className="font-mono text-xs text-steel-400">{p.sku}</p>
            <h3 className="mt-1 font-semibold text-steel-800">{p.title}</h3>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-lg font-bold text-steel-800">
                ${Number(p.price).toFixed(2)}
              </span>
              <span className="text-xs text-steel-400">
                {(p.stock ?? p.stockQty ?? 0)} in stock
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="text-steel-500">Loading…</p>}>
      <ProductsInner />
    </Suspense>
  );
}
