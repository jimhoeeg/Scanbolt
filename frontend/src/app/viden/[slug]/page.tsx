import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KNOWLEDGE, getArticle } from '@/lib/knowledge';

/**
 * /viden/[slug] — enkelt vidensartikel. generateStaticParams giver en statisk
 * side pr. artikel, så det virker med `output: export` på GitHub Pages.
 */
export function generateStaticParams() {
  return KNOWLEDGE.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getArticle(params.slug);
  if (!article) return { title: 'Viden — Scanbolt' };
  return { title: `${article.title} — Scanbolt`, description: article.summary };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = getArticle(params.slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/viden" className="text-sm font-semibold text-brand-red hover:underline">
        ← Al viden
      </Link>

      <header className="mt-4 flex items-center gap-4">
        <span className="text-4xl" aria-hidden>
          {article.icon}
        </span>
        <div>
          <span className="rounded-full bg-brand-bar px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide text-gray-600">
            {article.category}
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold text-gray-900">{article.title}</h1>
        </div>
      </header>

      {/* Nøglepointe */}
      <div className="mt-6 rounded-lg border-l-4 border-brand-green bg-brand-bar/70 p-5">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-brand-green">
          Vidste du?
        </p>
        <p className="mt-1 text-lg text-gray-800">{article.keyFact}</p>
      </div>

      {/* Fagviden */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-gray-900">Det skal du vide</h2>
        <dl className="mt-4 space-y-4">
          {article.facts.map((f) => (
            <div key={f.label} className="rounded-lg border border-gray-200 p-4">
              <dt className="font-semibold text-gray-900">{f.label}</dt>
              <dd className="mt-1 text-gray-600">{f.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Tegn på slid */}
      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-brand-red/30 bg-brand-red/5 p-5">
          <h2 className="font-display text-lg font-bold text-brand-red">Tegn på slid</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {article.wearSigns.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="text-brand-red">⚠</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-brand-green/30 bg-brand-green/5 p-5">
          <h2 className="font-display text-lg font-bold text-brand-green-dark">Råd fra værkstedet</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {article.tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-brand-green-dark">✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <div className="mt-10 rounded-lg bg-brand-dark p-6 text-center text-white">
        <p className="font-display text-lg font-bold">Skal vi hjælpe dig med de rigtige sliddele?</p>
        <p className="mt-1 text-sm text-gray-300">
          Vælg din maskine, så finder vi de dele der passer.
        </p>
        <Link
          href="/garage"
          className="mt-4 inline-block rounded bg-brand-green px-6 py-2.5 font-semibold text-white hover:bg-brand-green-dark"
        >
          Vælg din maskine
        </Link>
      </div>
    </article>
  );
}
