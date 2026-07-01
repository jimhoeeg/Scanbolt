import Link from 'next/link';
import type { KnowledgeArticle } from '@/lib/knowledge';

/**
 * Kompakt "Vidste du?"-faktaboks til vidensdeling. Bruges kontekstuelt rundt i
 * sitet (fx på Min Garage og produktsider) til at dele fagviden om slid.
 * Ren præsentationskomponent — kan bruges i server-komponenter.
 */
export function FactBox({ article }: { article: KnowledgeArticle }) {
  return (
    <aside className="rounded-lg border-l-4 border-brand-green bg-brand-bar/70 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {article.icon}
        </span>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-wide text-brand-green">
            Vidste du?
          </p>
          <p className="mt-1 text-sm text-gray-700">{article.keyFact}</p>
          <Link
            href={`/viden/${article.slug}`}
            className="mt-2 inline-block text-xs font-semibold text-brand-red hover:underline"
          >
            Læs mere om {article.category.toLowerCase()} →
          </Link>
        </div>
      </div>
    </aside>
  );
}
