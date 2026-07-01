/**
 * MODULE 1 — Identity routes.
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   GET  /api/auth/me       (requires a valid token)
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { login, register } from './identity.service';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName, role, companyName } = req.body ?? {};
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'email, password and fullName are required' });
    }
    // Only allow self-service registration for the two public roles.
    const safeRole = role === 'dealer' ? 'dealer' : 'standard_buyer';
    const result = await register({ email, password, fullName, role: safeRole, companyName });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const result = await login(email, password);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// Echo back the identity encoded in the token — the frontend calls this on
// boot to hydrate its auth context.
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
