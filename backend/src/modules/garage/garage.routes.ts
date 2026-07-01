/**
 * MODULE 2 — Garage routes.
 *   GET    /api/garage       Fetch saved machines for the logged-in user.
 *   POST   /api/garage       Add a machine to the garage.
 *   DELETE /api/garage/:id   Remove a machine from the garage.
 *
 * All routes require authentication. Fleet fields (customer_name / job_id)
 * are only read/written for dealers — enforced via `isDealer(req)`.
 */
import { Router } from 'express';
import { authenticate, isDealer } from '../../middleware/auth';
import { addToGarage, getGarage, removeFromGarage } from './garage.service';

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

export default router;
