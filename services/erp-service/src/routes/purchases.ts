import { Router, Response } from 'express';
import { z } from 'zod';
const router = Router();

const POSchema = z.object({
  vendor_id:     z.string().uuid(),
  items:         z.array(z.object({ sku: z.string(), qty: z.number().int().positive(), unit_price: z.number().positive() })),
  expected_date: z.string(),
  notes:         z.string().optional(),
});

router.get('/', async (req: any, res: Response) => {
  const { rows } = await req.db.query(`
    SELECT po.*, v.name AS vendor_name FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id ORDER BY po.created_at DESC
  `);
  res.json({ data: rows, total: rows.length });
});

router.post('/', async (req: any, res: Response) => {
  const parsed = POSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const total = d.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const { rows } = await req.db.query(
    `INSERT INTO purchase_orders (vendor_id, items, total_value, expected_date, notes, status)
     VALUES ($1, $2, $3, $4, $5, 'DRAFT') RETURNING *`,
    [d.vendor_id, JSON.stringify(d.items), total, d.expected_date, d.notes]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id/approve', async (req: any, res: Response) => {
  const { rows } = await req.db.query(
    `UPDATE purchase_orders SET status='APPROVED', approved_at=NOW() WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'PO not found' });
  res.json(rows[0]);
});

export default router;
