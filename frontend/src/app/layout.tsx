import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { RoleGate } from '@/components/RoleGate';
import { MachinePicker } from '@/components/MachinePicker';
import { NewsletterForm } from '@/components/NewsletterForm';

export const metadata: Metadata = {
  title: 'Scanbolt — Sliddele til entreprenørmaskiner',
  description:
    'Gummibælter, bæltemotorer, undervogn og sliddele til gravemaskiner. Vælg din maskine og find de dele der passer.',
};

const NAV = [
  { href: '/', label: 'Tilbud' },
  { href: '/garage', label: 'Vælg din maskine' },
  { href: '/products', label: 'Produkter' },
  { href: '/viden', label: 'Viden' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isDemo = process.env.NEXT_PUBLIC_DEMO === 'true';

  return (
    <html lang="da">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          {/* Øverste hjælpelinje */}
          <div className="hidden border-b border-gray-200 bg-white text-xs text-gray-600 md:block">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1">🇩🇰 DA</span>
                <Link href="/viden" className="hover:text-brand-red">
                  Video
                </Link>
                <Link href="/viden" className="hover:text-brand-red">
                  Om os
                </Link>
                <Link href="/viden" className="hover:text-brand-red">
                  Kontakt
                </Link>
                <span className="font-semibold text-gray-800">+45 4844 8330</span>
              </div>
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1">♥ Favoritter</span>
                <Link href="/" className="flex items-center gap-1 hover:text-brand-red">
                  🔒 Kundelogin
                </Link>
              </div>
            </div>
          </div>

          {/* Hovedheader: logo + navigation + kurv */}
          <header className="border-b border-gray-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4">
              <Link href="/" className="shrink-0">
                <span className="font-display text-3xl font-bold italic tracking-tight">
                  <span className="text-gray-900">Scan</span>
                  <span className="text-brand-red">Bolt</span>
                </span>
              </Link>

              <nav className="hidden items-center gap-6 lg:flex">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="nav-link">
                    {item.label}
                  </Link>
                ))}
                {/* Forhandler-portal vises kun for forhandlere (MODUL 1). */}
                <RoleGate allow="dealer">
                  <Link
                    href="/dealer"
                    className="font-display text-sm font-semibold uppercase tracking-wide text-brand-red hover:text-brand-red-dark"
                  >
                    Forhandler
                  </Link>
                </RoleGate>
              </nav>

              <div className="flex items-center gap-3">
                <button aria-label="Søg" className="text-gray-500 hover:text-brand-green">
                  🔍
                </button>
                <button
                  aria-label="Kurv"
                  className="relative rounded bg-brand-green px-4 py-2 text-white hover:bg-brand-green-dark"
                >
                  🛒
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-red text-[10px] font-bold">
                    0
                  </span>
                </button>
              </div>
            </div>

            {/* Mobil-navigation */}
            <nav className="flex items-center gap-4 overflow-x-auto border-t border-gray-100 px-4 py-2 lg:hidden">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link whitespace-nowrap">
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          {/* Maskinvælger */}
          <MachinePicker />

          {isDemo && (
            <div className="bg-brand-red px-4 py-1.5 text-center text-xs font-medium text-white">
              DEMO — statisk GitHub Pages-forhåndsvisning med testdata. Log ind med en e-mail der
              indeholder “dealer” for at låse Forhandler-portalen op.
            </div>
          )}

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>

          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}

/** Footer der matcher Scanbolts mørke footer med kolonner og badges. */
function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand-dark text-gray-300">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kontakt */}
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">
            Kontakt
          </h3>
          <address className="mt-4 space-y-1 text-sm not-italic">
            <p>Scanbolt A/S</p>
            <p>Bodøvej 8</p>
            <p>8700 Horsens</p>
            <p className="pt-2 font-semibold text-white">+45 4844 8330</p>
            <p>info@scanbolt.com</p>
            <p className="pt-2 text-gray-400">CVR.: 33 39 75 42</p>
          </address>
          <div className="mt-4 flex gap-3 text-lg">
            <span aria-hidden>📘</span>
            <span aria-hidden>▶️</span>
          </div>
        </div>

        {/* Kundeservice */}
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">
            Kundeservice
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/viden" className="hover:text-white">Kontakt os</Link></li>
            <li><Link href="/" className="hover:text-white">Forside</Link></li>
            <li><Link href="/" className="hover:text-white">Min kurv</Link></li>
            <li><Link href="/" className="hover:text-white">Tilbud</Link></li>
            <li><Link href="/viden" className="hover:text-white">Viden om sliddele</Link></li>
            <li><Link href="/dealer" className="hover:text-white">B2B-login</Link></li>
          </ul>
        </div>

        {/* Top kategorier */}
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-white">
            Top kategorier
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            {['Gummibælter', 'Bæltemotor', 'Stålbælter', 'Graveskovl', 'Skovklo/Grab', 'Fedt, belysning etc.'].map(
              (c) => (
                <li key={c}>
                  <Link href="/products" className="text-brand-green hover:text-white">
                    {c}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>

        {/* Badges + nyhedsbrev */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded bg-white/10 px-3 py-1 text-xs font-semibold">★ Trustpilot 4,9</span>
            <span className="rounded-full bg-yellow-500/90 px-3 py-1 text-xs font-bold text-brand-dark">
              Guld 7+ år
            </span>
            <span className="rounded bg-brand-red px-3 py-1 text-xs font-bold text-white">AAA</span>
          </div>

          <h3 className="mt-6 font-display text-sm font-bold uppercase tracking-wide text-white">
            Betaling
          </h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {['Dankort', 'VISA', 'VISA El.', 'MC', 'Maestro', 'MobilePay'].map((p) => (
              <span key={p} className="rounded bg-white px-2 py-1 font-semibold text-gray-800">
                {p}
              </span>
            ))}
          </div>

          <h3 className="mt-6 font-display text-sm font-bold uppercase tracking-wide text-white">
            Tilmeld nyhedsbrev
          </h3>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-gray-500">
        © 2025 Scanbolt A/S
      </div>
    </footer>
  );
}
