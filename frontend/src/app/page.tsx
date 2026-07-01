'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/**
 * Landing page. Demonstrates the top-level split between the standard shop UI
 * and the extended Dealer Portal, driven entirely by role state (MODULE 1).
 */
export default function HomePage() {
  const { isAuthenticated, isDealer, user, login, logout } = useAuth();

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-steel-200 bg-white p-8">
        <h1 className="text-3xl font-bold text-steel-800">Heavy machinery spare parts, fast.</h1>
        <p className="mt-2 max-w-2xl text-steel-500">
          Excavators, final drives and rubber tracks — matched to your exact machine. Sign in to
          access My Garage; dealers unlock the high-volume portal automatically.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/garage"
            className="rounded bg-steel-800 px-5 py-2 font-medium text-white hover:bg-steel-700"
          >
            Open My Garage
          </Link>
          {isDealer && (
            <Link
              href="/dealer"
              className="rounded bg-safety-500 px-5 py-2 font-medium text-steel-900 hover:bg-safety-400"
            >
              Dealer Portal →
            </Link>
          )}
        </div>
      </section>

      {/* Minimal auth panel for demoing the role switch. */}
      <section className="rounded-lg border border-steel-200 bg-white p-6">
        {isAuthenticated ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-steel-600">
              Signed in as <span className="font-semibold">{user?.email}</span>{' '}
              <span className="ml-2 rounded bg-steel-100 px-2 py-0.5 text-xs uppercase tracking-wide text-steel-500">
                {isDealer ? 'dealer' : 'standard buyer'}
              </span>
            </p>
            <button onClick={logout} className="text-sm text-steel-500 underline hover:text-steel-800">
              Sign out
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
        <span className="mb-1 block text-steel-500">Email</span>
        <input
          name="email"
          type="email"
          defaultValue="dealer@bigworkshop.com"
          className="rounded border border-steel-300 px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-steel-500">Password</span>
        <input
          name="password"
          type="password"
          defaultValue="password123"
          className="rounded border border-steel-300 px-3 py-2"
        />
      </label>
      <button className="rounded bg-steel-800 px-4 py-2 text-white hover:bg-steel-700" type="submit">
        Sign in
      </button>
    </form>
  );
}
