/**
 * MODULE 1 — Authentication + role gating middleware.
 *
 * `authenticate`  verifies the JWT and attaches the user to the request.
 * `requireRole`   is a higher-order guard that grants/denies access to a
 *                 route based on the user's roles.
 *
 * Usage:
 *   router.get('/api/garage', authenticate, garageHandler);
 *   router.use('/api/dealer', authenticate, requireRole('dealer'));
 */
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, RoleName } from '../types';

// Augment Express's Request so downstream handlers get a typed `req.user`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: RoleName[];
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me-in-production';

/**
 * Verify the Bearer token and populate `req.user`.
 * Rejects with 401 when the token is missing or invalid.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email, roles: payload.roles };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Guard a route to one or more roles. The user needs at least ONE of the
 * allowed roles. Assumes `authenticate` ran earlier in the chain.
 *
 *   requireRole('dealer')               // dealers only
 *   requireRole('dealer', 'admin')      // dealers OR admins
 */
export function requireRole(...allowed: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasRole = req.user.roles.some((r) => allowed.includes(r));
    if (!hasRole) {
      res.status(403).json({
        error: 'Insufficient permissions',
        requiredRole: allowed,
        yourRoles: req.user.roles,
      });
      return;
    }

    next();
  };
}

/** Small helper for handlers that need to branch on dealer vs buyer. */
export function isDealer(req: Request): boolean {
  return req.user?.roles.includes('dealer') ?? false;
}
