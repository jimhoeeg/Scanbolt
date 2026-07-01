/**
 * GAMIFICATION Fase 5 — progress-routes.
 *   GET  /api/progress         Brugerens XP/niveau.
 *   POST /api/progress/track   Registrér en bruger-handling (fx guide_read).
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getProgress, trackAction } from './progress.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    res.json(await getProgress(req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.post('/track', async (req, res, next) => {
  try {
    const action = (req.body?.action ?? '').toString();
    const ref = req.body?.ref != null ? String(req.body.ref) : null;
    if (!action) return res.status(400).json({ error: 'action is required' });
    return res.json(await trackAction(req.user!.id, action, ref));
  } catch (err) {
    return next(err);
  }
});

export default router;
