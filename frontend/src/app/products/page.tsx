'use client';

/**
 * MODUL 2 — /products (Produkter)
 * Med ?machine_id=XYZ vises kun dele der passer til maskinen (fitment-filtreret).
 * Uden parameter vises hele kataloget. useSearchParams skal ligge i en
 * Suspense-grænse for den statiske eksport-build.
 */
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { FactBox } from '@/components/FactBox';
import { KNOWLEDGE } from '@/lib/knowledge';

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
    (async () => {
      try {
        const res = machineId
          ? await api.getProductsForMachine(machineId)
          : await api.getAllProducts();
        setParts(res.parts as CatalogPart[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [machineId]);

  return (
    <section>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          {machineId ? 'Passende dele' : 'Produkter'}
        </h1>
        <p className="text-sm text-gray-500">
          {machineId
            ? `Kun dele der er verificeret til at passe denne maskine (${parts.length} fundet).`
            : `Hele sortimentet af sliddele (${parts.length} varer).`}
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : parts.length === 0 ? (
        <p className="text-gray-500">Ingen produkter fundet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map((p) => (
            <article
              key={p.sku}
              className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 transition hover:border-brand-green hover:shadow-md"
            >
              <p className="font-mono text-xs text-gray-400">{p.sku}</p>
              <h3 className="mt-1 font-semibold text-gray-900">{p.title}</h3>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-display text-lg font-bold text-gray-900">
                  {Number(p.price).toLocaleString('da-DK', { minimumFractionDigits: 2 })} kr.
                </span>
                <span className="text-xs text-gray-400">
                  {p.stock ?? p.stockQty ?? 0} på lager
                </span>
              </div>
              <button className="mt-3 rounded bg-brand-green px-3 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark">
                Læg i kurv
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="mt-8">
        <FactBox article={KNOWLEDGE[1]} />
      </div>
    </section>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="text-gray-500">Indlæser…</p>}>
      <ProductsInner />
    </Suspense>
  );
}
