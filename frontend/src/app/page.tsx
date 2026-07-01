'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { KNOWLEDGE } from '@/lib/knowledge';
import { KnowledgeCard } from '@/components/knowledge/KnowledgeCard';

/**
 * Forsiden. Viser det overordnede skift mellem standard-shoppen og den
 * udvidede Forhandler-portal, styret af rolle-state (MODUL 1), samt
 * vidensdeling om sliddele.
 */
export default function HomePage() {
  const { isAuthenticated, isDealer, user, login, logout } = useAuth();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="overflow-hidden rounded-lg bg-brand-dark text-white">
        <div className="grid gap-6 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-block bg-brand-red px-4 py-1.5 font-display text-lg font-bold uppercase tracking-wide">
              Undervogn
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
              Sliddele til dine entreprenørmaskiner
            </h1>
            <p className="mt-4 max-w-xl text-gray-300">
              Gummibælter, bæltemotorer og undervogn — matchet præcist til din maskine. Log ind for
              at bruge Min Garage; forhandlere låser automatisk B2B-portalen op.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/garage"
                className="rounded bg-brand-green px-6 py-3 font-display font-semibold uppercase tracking-wide hover:bg-brand-green-dark"
              >
                Vælg din maskine
              </Link>
              <Link
                href="/viden"
                className="rounded border border-white/30 px-6 py-3 font-display font-semibold uppercase tracking-wide hover:bg-white/10"
              >
                Se vores viden
              </Link>
            </div>
          </div>
          <div className="hidden justify-end lg:flex">
            <div className="grid grid-cols-3 gap-2 text-center">
              {['🛞', '⚙️', '🔧', '🔩', '🚜', '🛠️'].map((e, i) => (
                <div
                  key={i}
                  className="flex h-24 w-24 items-center justify-center rounded bg-white/5 text-4xl"
                >
                  {e}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust-strip */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { t: 'Hurtig levering 1-3 dage', s: 'Ved bestilling inden kl. 10.00 (ved lagervarer)', icon: '🚚' },
          { t: 'Fremragende', s: '1.076 anmeldelser på Trustpilot ★★★★★', icon: '⭐' },
          { t: 'Kundeservice & support', s: 'Ring til os på +45 4844 8330', icon: '📞' },
        ].map((f) => (
          <div key={f.t} className="flex items-center gap-4 rounded-lg bg-brand-dark p-5 text-white">
            <span className="text-3xl">{f.icon}</span>
            <div>
              <p className="font-display font-bold uppercase tracking-wide">{f.t}</p>
              <p className="text-sm text-gray-300">{f.s}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Vidensdeling */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-wide text-brand-green">
              Del af vores viden
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-gray-900">
              Guides om slid og vedligehold
            </h2>
          </div>
          <Link href="/viden" className="text-sm font-semibold text-brand-red hover:underline">
            Se al viden →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {KNOWLEDGE.slice(0, 3).map((a) => (
            <KnowledgeCard key={a.slug} article={a} />
          ))}
        </div>
      </section>

      {/* Demo-login */}
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        {isAuthenticated ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Logget ind som <span className="font-semibold">{user?.email}</span>{' '}
              <span className="ml-2 rounded bg-brand-bar px-2 py-0.5 text-xs uppercase tracking-wide text-gray-500">
                {isDealer ? 'forhandler' : 'privatkunde'}
              </span>
            </p>
            <button onClick={logout} className="text-sm text-gray-500 underline hover:text-gray-800">
              Log ud
            </button>
          </div>
        ) : (
          <DemoLogin onLogin={login} />
        )}
      </section>
    </div>
  );
}

function DemoLogin({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  return (
    <div>
      <p className="mb-3 font-display text-lg font-bold text-gray-900">Kundelogin</p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const email = (form.elements.namedItem('email') as HTMLInputElement).value;
          const password = (form.elements.namedItem('password') as HTMLInputElement).value;
          try {
            await onLogin(email, password);
          } catch (err) {
            alert((err as Error).message);
          }
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-gray-500">E-mail</span>
          <input
            name="email"
            type="email"
            defaultValue="dealer@bigworkshop.com"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-500">Adgangskode</span>
          <input
            name="password"
            type="password"
            defaultValue="password123"
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          className="rounded bg-brand-green px-5 py-2 font-display font-semibold uppercase tracking-wide text-white hover:bg-brand-green-dark"
          type="submit"
        >
          Log ind
        </button>
      </form>
      <p className="mt-2 text-xs text-gray-400">
        Tip: en e-mail med “dealer” logger ind som forhandler og låser B2B-portalen op.
      </p>
    </div>
  );
}
