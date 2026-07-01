/**
 * MODULE 3 — Dealer Portal routes. Restricted to the 'dealer' role.
 *   POST /api/dealer/quick-order   Validate + price an array of SKUs/quantities.
 *   POST /api/dealer/oem-lookup     Resolve an OEM number to a SKU + availability.
 *   POST /api/dealer/upload-csv     Parse a multipart CSV into cart-ready lines.
 *
 * The whole router is gated by requireRole('dealer'); a standard buyer hitting
 * any of these gets a 403.
 */
import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../../middleware/auth';
import { parseOrderCsv } from './csv';
import { lookupOem, resolveCsvRows, resolveQuickOrder } from './dealer.service';

const router = Router();

// CSV files only, held in memory (never touches disk), 2 MB cap.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.includes('csv') || file.originalname.toLowerCase().endsWith('.csv');
    if (ok) cb(null, true);
    else cb(new Error('Only .csv files are accepted'));
  },
});

// Gate every dealer route.
router.use(authenticate, requireRole('dealer'));

router.post('/quick-order', async (req, res, next) => {
  try {
    const lines = req.body?.lines;
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'lines[] with {sku, quantity} is required' });
    }
    const cleaned = lines
      .filter((l) => l && typeof l.sku === 'string' && Number(l.quantity) > 0)
      .map((l) => ({ sku: l.sku.trim(), quantity: Math.floor(Number(l.quantity)) }));

    const result = await resolveQuickOrder(req.user!.id, cleaned);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/oem-lookup', async (req, res, next) => {
  try {
    const oemNumber = (req.body?.oemNumber ?? '').toString().trim();
    if (!oemNumber) return res.status(400).json({ error: 'oemNumber is required' });
    const result = await lookupOem(oemNumber);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

router.post('/upload-csv', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file (field "file") is required' });

    const parsed = parseOrderCsv(req.file.buffer);
    const resolved = await resolveCsvRows(parsed);

    const validRows = resolved.filter((r) => r.resolved);
    const invalidRows = resolved.filter((r) => !r.resolved);

    // The frontend adds validRows to the cart and highlights invalidRows.
    return res.json({
      totalRows: resolved.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      rows: resolved,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
