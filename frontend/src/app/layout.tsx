import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { RoleGate } from '@/components/RoleGate';

export const metadata: Metadata = {
  title: 'Scanbolt — Heavy Machinery Spare Parts',
  description: 'Excavators, final drives, rubber tracks. B2C shop + B2B dealer portal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <header className="border-b border-steel-200 bg-steel-800 text-steel-50">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
                <span className="inline-block h-6 w-6 rounded-sm bg-safety-500" aria-hidden />
                SCANBOLT
              </Link>
              <div className="flex items-center gap-6 text-sm font-medium">
                <Link href="/garage" className="hover:text-safety-400">
                  My Garage
                </Link>
                {/* MODULE 1 — Dealer Portal link only renders for dealers. */}
                <RoleGate allow="dealer">
                  <Link
                    href="/dealer"
                    className="rounded bg-safety-500 px-3 py-1 text-steel-900 hover:bg-safety-400"
                  >
                    Dealer Portal
                  </Link>
                </RoleGate>
              </div>
            </nav>
          </header>
          {process.env.NEXT_PUBLIC_DEMO === 'true' && (
            <div className="bg-safety-500 px-4 py-1.5 text-center text-xs font-medium text-steel-900">
              DEMO MODE — static GitHub Pages preview with mock data. Sign in with any email
              containing “dealer” to unlock the Dealer Portal.
            </div>
          )}
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
