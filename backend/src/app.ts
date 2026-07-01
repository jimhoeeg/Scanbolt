/**
 * Express application wiring. Each module mounts its own router; there is no
 * cross-module import of route handlers, keeping the modular boundary clean.
 */
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';

import identityRoutes from './modules/identity/identity.routes';
import garageRoutes from './modules/garage/garage.routes';
import productRoutes from './modules/products/products.routes';
import dealerRoutes from './modules/dealer/dealer.routes';
import checkoutRoutes from './modules/checkout/checkout.routes';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // MODULE 1 — auth & identity
  app.use('/api/auth', identityRoutes);
  // MODULE 2 — garage + fitment-filtered catalog
  app.use('/api/garage', garageRoutes);
  app.use('/api/products', productRoutes);
  // MODULE 3 — dealer portal (role-gated inside the router)
  app.use('/api/dealer', dealerRoutes);
  // MODULE 4 — checkout with job-referenced order metadata
  app.use('/api/checkout', checkoutRoutes);

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  // Centralised error handler — services throw errors with an optional
  // `status` property; everything else is a 500.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
