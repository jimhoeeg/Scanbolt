/**
 * MODULE 2 — Garage routes.
 *   GET    /api/garage            Fetch saved machines for the logged-in user.
 *   POST   /api/garage            Add a machine to the garage.
 *   DELETE /api/garage/:id        Remove a machine from the garage.
 *   PATCH  /api/garage/:id/hours  Update operating hours (Fase 1).
 *   POST   /api/garage/:id/service  Mark as serviced (Fase 1).
 *   GET    /api/garage/:id/wear   Wear estimate per component (Fase 2).
 *
 * All routes require authentication. Fleet fields (customer_name / job_id)
 * are only read/written for dealers — enforced via `isDealer(req)`.
 */
import { Router } from 'express';
import { authenticate, isDealer } from '../../middleware/auth';
import {
  addMaintenanceLog,
  addToGarage,
  getGarage,
  getMaintenanceLog,
  getSummary,
  getWear,
  markServiced,
  removeFromGarage,
  updateHours,
} from './garage.service';

const MAINT_TYPES = ['service', 'repair', 'inspection', 'part_replaced', 'note'] as const;

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const entries = await getGarage(req.user!.id, isDealer(req));
    res.json({ entries, isDealer: isDealer(req) });
  } catch (err) {
    next(err);
  }
});

// Fase 4 — garage-resumé + milepæle.
router.get('/summary', async (req, res, next) => {
  try {
    res.json(await getSummary(req.user!.id, isDealer(req)));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { machineId, nickname, customerName, jobId, serialNumber } = req.body ?? {};
    if (!machineId) {
      return res.status(400).json({ error: 'machineId is required' });
    }
    const entry = await addToGarage(
      req.user!.id,
      { machineId, nickname, customerName, jobId, serialNumber },
      isDealer(req),
    );
    return res.status(201).json({ entry });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const removed = await removeFromGarage(req.user!.id, req.params.id);
    if (!removed) return res.status(404).json({ error: 'Garage entry not found' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

// Fase 1 — opdatér driftstimer.
router.patch('/:id/hours', async (req, res, next) => {
  try {
    const currentHours = Number(req.body?.currentHours);
    if (!Number.isFinite(currentHours) || currentHours < 0) {
      return res.status(400).json({ error: 'currentHours must be a non-negative number' });
    }
    const entry = await updateHours(req.user!.id, req.params.id, currentHours, isDealer(req));
    return res.json({ entry });
  } catch (err) {
    return next(err);
  }
});

// Fase 1 — marker som serviceret.
router.post('/:id/service', async (req, res, next) => {
  try {
    const entry = await markServiced(req.user!.id, req.params.id, isDealer(req));
    return res.json({ entry });
  } catch (err) {
    return next(err);
  }
});

// Fase 2 — slid-estimat pr. komponent.
router.get('/:id/wear', async (req, res, next) => {
  try {
    const result = await getWear(req.user!.id, req.params.id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// Fase 4 — vedligeholds-logbog.
router.get('/:id/log', async (req, res, next) => {
  try {
    return res.json(await getMaintenanceLog(req.user!.id, req.params.id));
  } catch (err) {
    return next(err);
  }
});

router.post('/:id/log', async (req, res, next) => {
  try {
    const { type, title, hours, sku } = req.body ?? {};
    if (!MAINT_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of ${MAINT_TYPES.join(', ')}` });
    }
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    const log = await addMaintenanceLog(req.user!.id, req.params.id, {
      type,
      title: title.slice(0, 200),
      hours: hours != null && Number.isFinite(Number(hours)) ? Math.floor(Number(hours)) : null,
      sku: sku ? String(sku) : null,
    });
    return res.status(201).json(log);
  } catch (err) {
    return next(err);
  }
});

export default router;
