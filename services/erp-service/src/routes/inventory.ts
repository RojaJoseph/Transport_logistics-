import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const InventorySchema = z.object({
  sku:          z.string().min(3),
  name:         z.string().min(2),
  qty:          z.number().int().min(0),
  unit:         z.string(),
  warehouse_id: z.string().uuid(),
  unit_cost:    z.number().positive(),
  reorder_level:z.number().int().min(0).default(50),
});

// GET /inventory
router.get('/', async (req: any, res: Response) => {
  try {
    const cache = await req.redis.get('inventory:all');
    if (cache) return res.json(JSON.parse(cache));

    const { rows } = await req.db.query(`
      SELECT i.*, w.name AS warehouse_name
      FROM inventory i
      LEFT JOIN warehouses w ON i.warehouse_id = w.id
      ORDER BY i.updated_at DESC
    `);
    await req.redis.setex('inventory:all', 30, JSON.stringify({ data: rows, total: rows.length }));
    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /inventory/:sku
router.get('/:sku', async (req: any, res: Response) => {
  const { rows } = await req.db.query('SELECT * FROM inventory WHERE sku = $1', [req.params.sku]);
  if (!rows.length) return res.status(404).json({ error: 'SKU not found' });
  res.json(rows[0]);
});

// POST /inventory
router.post('/', async (req: any, res: Response) => {
  const parsed = InventorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const { rows } = await req.db.query(
    `INSERT INTO inventory (sku, name, qty, unit, warehouse_id, unit_cost, reorder_level)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [d.sku, d.name, d.qty, d.unit, d.warehouse_id, d.unit_cost, d.reorder_level]
  );
  await req.redis.del('inventory:all');
  res.status(201).json(rows[0]);
});

// PATCH /inventory/:sku/adjust — stock adjustment
router.patch('/:sku/adjust', async (req: any, res: Response) => {
  const { delta, reason } = req.body;
  if (typeof delta !== 'number') return res.status(400).json({ error: 'delta must be a number' });

  const { rows } = await req.db.query(
    `UPDATE inventory SET qty = qty + $1, updated_at = NOW() WHERE sku = $2 RETURNING *`,
    [delta, req.params.sku]
  );
  if (!rows.length) return res.status(404).json({ error: 'SKU not found' });

  // Audit log
  await req.db.query(
    `INSERT INTO inventory_audit (sku, delta, reason, created_at) VALUES ($1,$2,$3,NOW())`,
    [req.params.sku, delta, reason ?? 'manual adjustment']
  );
  await req.redis.del('inventory:all');
  res.json(rows[0]);
});

// DELETE /inventory/:sku
router.delete('/:sku', async (req: any, res: Response) => {
  await req.db.query('DELETE FROM inventory WHERE sku = $1', [req.params.sku]);
  await req.redis.del('inventory:all');
  res.status(204).send();
});

export default router;
