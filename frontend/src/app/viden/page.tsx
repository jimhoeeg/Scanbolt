import type { Metadata } from 'next';
import { KNOWLEDGE } from '@/lib/knowledge';
import { KnowledgeCard } from '@/components/knowledge/KnowledgeCard';

export const metadata: Metadata = {
  title: 'Viden om sliddele — Scanbolt',
  description:
    'Guides og fagviden om slid, levetid og vedligehold af undervogn, gummibælter og bæltemotorer.',
};

/**
 * /viden — vidensdeling. Oversigt over alle guides. Ren server-komponent, så
 * indholdet er fuldt statisk og kan indekseres.
 */
export default function VidenPage() {
  return (
    <div>
      <header className="mb-8 max-w-3xl">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-brand-green">
          Del af vores viden
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-gray-900">Viden om sliddele</h1>
        <p className="mt-2 text-gray-600">
          Vi deler ud af 30+ års erfaring med undervogn, gummibælter og bæltemotorer. Her finder du
          konkrete guides til at aflæse slid, forlænge levetiden og undgå de dyre nedbrud.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {KNOWLEDGE.map((article) => (
          <KnowledgeCard key={article.slug} article={article} />
        ))}
      </div>
    </div>
  );
}
