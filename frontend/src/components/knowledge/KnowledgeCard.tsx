import Link from 'next/link';
import type { KnowledgeArticle } from '@/lib/knowledge';

/** Kort til oversigten under /viden. */
export function KnowledgeCard({ article }: { article: KnowledgeArticle }) {
  return (
    <Link
      href={`/viden/${article.slug}`}
      className="group flex flex-col rounded-lg border border-gray-200 bg-white p-5 transition hover:border-brand-green hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {article.icon}
        </span>
        <span className="rounded-full bg-brand-bar px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide text-gray-600">
          {article.category}
        </span>
      </div>
      <h3 className="mt-4 font-display text-lg font-bold leading-tight text-gray-900 group-hover:text-brand-green">
        {article.title}
      </h3>
      <p className="mt-2 flex-1 text-sm text-gray-600">{article.summary}</p>
      <span className="mt-4 text-sm font-semibold text-brand-red">Læs guide →</span>
    </Link>
  );
}
