/**
 * MODULE 4 — Checkout.
 *   POST /api/checkout   Create an order from cart lines.
 *
 * When a dealer checks out with a garageId, the fleet job_id / customer_name
 * from that garage entry are copied onto the order so invoices carry the job
 * reference. The order is then "synced" to the ERP (Business Central sim).
 */
import { Router } from 'express';
import { queryOne, withTransaction } from '../../db/pool';
import { authenticate, isDealer } from '../../middleware/auth';
import { calculateB2BPrice, getErpCustomerId, simulateErpSync } from '../pricing/pricing.service';
import { awardXp } from '../progress/progress.service';

const router = Router();
router.use(authenticate);

interface CartLine {
  sku: string;
  quantity: number;
}

router.post('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const dealer = isDealer(req);
    const lines: CartLine[] = Array.isArray(req.body?.lines) ? req.body.lines : [];
    const garageId: string | undefined = req.body?.garageId;
    const poNumber: string | undefined = req.body?.poNumber;

    if (lines.length === 0) {
      return res.status(400).json({ error: 'lines[] with {sku, quantity} is required' });
    }

    // Pull fleet metadata from the referenced garage entry (dealers only).
    let jobId: string | null = null;
    let customerName: string | null = null;
    if (dealer && garageId) {
      const garage = await queryOne<{ job_id: string | null; customer_name: string | null }>(
        `SELECT job_id, customer_name FROM user_garages WHERE id = $1 AND user_id = $2`,
        [garageId, userId],
      );
      if (!garage) return res.status(404).json({ error: 'Garage entry not found' });
      jobId = garage.job_id;
      customerName = garage.customer_name;
    }

    const order = await withTransaction(async (client) => {
      // Create the order shell.
      const { rows: orderRows } = await client.query<{ id: string }>(
        `INSERT INTO orders (user_id, status, job_id, customer_name, metadata)
         VALUES ($1, 'pending', $2, $3, $4)
         RETURNING id`,
        [userId, jobId, customerName, JSON.stringify({ poNumber: poNumber ?? null })],
      );
      const orderId = orderRows[0].id;

      let subtotal = 0;
      let discountTotal = 0;

      for (const line of lines) {
        const part = await client.query<{
          id: string;
          sku: string;
          title: string;
          price: string;
          stock_qty: number;
        }>(`SELECT id, sku, title, price, stock_qty FROM parts WHERE sku = $1 AND is_active = TRUE`, [
          line.sku,
        ]);
        if (part.rowCount === 0) {
          throw Object.assign(new Error(`Unknown SKU: ${line.sku}`), { status: 400 });
        }
        const p = part.rows[0];
        const listPrice = Number(p.price);

        if (p.stock_qty < line.quantity) {
          throw Object.assign(
            new Error(`Insufficient stock for ${line.sku} (have ${p.stock_qty})`),
            { status: 409 },
          );
        }

        // Dealers get B2B pricing; standard buyers pay list.
        const netUnit = dealer
          ? (await calculateB2BPrice(userId, p.sku, listPrice, line.quantity)).netUnitPrice
          : listPrice;
        const lineTotal = Math.round(netUnit * line.quantity * 100) / 100;

        subtotal += listPrice * line.quantity;
        discountTotal += (listPrice - netUnit) * line.quantity;

        await client.query(
          `INSERT INTO order_items
              (order_id, part_id, sku, title, quantity, unit_list_price, unit_net_price, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [orderId, p.id, p.sku, p.title, line.quantity, listPrice, netUnit, lineTotal],
        );

        // Decrement stock inside the same transaction.
        await client.query(`UPDATE parts SET stock_qty = stock_qty - $1 WHERE id = $2`, [
          line.quantity,
          p.id,
        ]);
      }

      const grandTotal = Math.round((subtotal - discountTotal) * 100) / 100;
      await client.query(
        `UPDATE orders
            SET subtotal = $1, discount_total = $2, grand_total = $3, status = 'confirmed'
          WHERE id = $4`,
        [Math.round(subtotal * 100) / 100, Math.round(discountTotal * 100) / 100, grandTotal, orderId],
      );

      return { orderId, subtotal, discountTotal, grandTotal };
    });

    // Post-commit: simulate ERP sync and stamp the reference back onto the order.
    let erpReference: string | null = null;
    if (dealer) {
      const erpCustomerId = await getErpCustomerId(userId);
      const sync = await simulateErpSync({
        orderId: order.orderId,
        erpCustomerId,
        jobId,
        grandTotal: order.grandTotal,
      });
      erpReference = sync.erpReference;
      await queryOne(`UPDATE orders SET erp_reference = $1 WHERE id = $2`, [
        erpReference,
        order.orderId,
      ]);
    }

    await awardXp(userId, 'order_placed', order.orderId);

    return res.status(201).json({
      orderId: order.orderId,
      subtotal: Math.round(order.subtotal * 100) / 100,
      discountTotal: Math.round(order.discountTotal * 100) / 100,
      grandTotal: order.grandTotal,
      jobId,
      customerName,
      erpReference,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
