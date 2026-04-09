import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { z } from 'zod';

const app  = express();

// ── Database — Docker service name fallback ───────────────────────
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    `postgresql://${process.env.POSTGRES_USER ?? 'logistics'}:${process.env.POSTGRES_PASSWORD ?? 'secret'}@${process.env.POSTGRES_HOST ?? 'postgres'}:${process.env.POSTGRES_PORT ?? 5432}/${process.env.POSTGRES_DB ?? 'logistics'}`,
  max: 10,
});

// ── Redis — Docker service name fallback ──────────────────────────
const redis = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379', {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});
redis.connect().catch(() => console.warn('[erp] Redis unavailable — caching disabled'));

app.set('trust proxy', 1);
app.use(helmet()); app.use(cors()); app.use(express.json());

// Attach db+redis to every request
app.use((req: any, _res, next) => { req.db = pool; req.redis = redis; next(); });

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'erp', ts: new Date().toISOString() })
);

// ── Inventory ─────────────────────────────────────────────────────
app.get('/inventory', async (req: any, res) => {
  try {
    const cache = await redis.get('erp:inventory:all').catch(() => null);
    if (cache) return res.json(JSON.parse(cache));

    const { rows } = await pool.query(`
      SELECT i.*, w.name AS warehouse_name
      FROM inventory i LEFT JOIN warehouses w ON i.warehouse_id = w.id
      ORDER BY i.updated_at DESC`);

    const result = { data: rows, total: rows.length };
    redis.setex('erp:inventory:all', 30, JSON.stringify(result)).catch(() => {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/inventory/:sku', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM inventory WHERE sku = $1', [req.params.sku]);
  if (!rows.length) return res.status(404).json({ error: 'SKU not found' });
  res.json(rows[0]);
});

const InvSchema = z.object({
  sku:          z.string().min(3),
  name:         z.string().min(2),
  qty:          z.number().int().min(0),
  unit:         z.string(),
  warehouse_id: z.string().uuid().optional(),
  unit_cost:    z.number().positive(),
  reorder_level:z.number().int().default(50),
  tenant_id:    z.string().uuid(),
});

app.post('/inventory', async (req, res) => {
  const p = InvSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const d = p.data;
  const { rows } = await pool.query(
    `INSERT INTO inventory (tenant_id,sku,name,qty,unit,warehouse_id,unit_cost,reorder_level)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [d.tenant_id, d.sku, d.name, d.qty, d.unit, d.warehouse_id ?? null, d.unit_cost, d.reorder_level]
  );
  redis.del('erp:inventory:all').catch(() => {});
  res.status(201).json(rows[0]);
});

app.patch('/inventory/:sku/adjust', async (req, res) => {
  const { delta, reason } = req.body;
  if (typeof delta !== 'number') return res.status(400).json({ error: 'delta must be a number' });
  const { rows } = await pool.query(
    'UPDATE inventory SET qty = qty + $1, updated_at = NOW() WHERE sku = $2 RETURNING *',
    [delta, req.params.sku]
  );
  if (!rows.length) return res.status(404).json({ error: 'SKU not found' });
  await pool.query('INSERT INTO inventory_audit (sku,delta,reason) VALUES ($1,$2,$3)',
    [req.params.sku, delta, reason ?? 'manual adjustment']);
  redis.del('erp:inventory:all').catch(() => {});
  res.json(rows[0]);
});

app.delete('/inventory/:sku', async (req, res) => {
  await pool.query('DELETE FROM inventory WHERE sku = $1', [req.params.sku]);
  redis.del('erp:inventory:all').catch(() => {});
  res.status(204).send();
});

// ── Vendors ───────────────────────────────────────────────────────
app.get('/vendors', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM vendors ORDER BY name');
  res.json({ data: rows, total: rows.length });
});

app.get('/vendors/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });
  res.json(rows[0]);
});

const VendorSchema = z.object({
  tenant_id:     z.string().uuid(),
  name:          z.string().min(2),
  gstin:         z.string().optional(),
  email:         z.string().email().optional(),
  phone:         z.string().optional(),
  address:       z.string().optional(),
  payment_terms: z.number().int().default(30),
  rating:        z.number().min(0).max(5).default(3),
});

app.post('/vendors', async (req, res) => {
  const p = VendorSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const d = p.data;
  const { rows } = await pool.query(
    `INSERT INTO vendors (tenant_id,name,gstin,email,phone,address,payment_terms,rating)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [d.tenant_id, d.name, d.gstin ?? null, d.email ?? null,
     d.phone ?? null, d.address ?? null, d.payment_terms, d.rating]
  );
  res.status(201).json(rows[0]);
});

app.patch('/vendors/:id', async (req, res) => {
  const allowed = ['name','email','phone','address','payment_terms','rating','active'];
  const fields  = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  const sets = fields.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE vendors SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [req.params.id, ...fields.map(([, v]) => v)]
  );
  if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });
  res.json(rows[0]);
});

// ── Warehouses ────────────────────────────────────────────────────
app.get('/warehouses', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM warehouses ORDER BY name');
  res.json({ data: rows, total: rows.length });
});

app.post('/warehouses', async (req, res) => {
  const { tenant_id, name, city, state, pincode, capacity_sqm, type = 'general', lat, lng } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO warehouses (tenant_id,name,city,state,pincode,capacity_sqm,type,lat,lng)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [tenant_id, name, city, state, pincode, capacity_sqm, type, lat ?? null, lng ?? null]
  );
  res.status(201).json(rows[0]);
});

// ── Purchase Orders ───────────────────────────────────────────────
app.get('/purchases', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT po.*, v.name AS vendor_name
    FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id
    ORDER BY po.created_at DESC`);
  res.json({ data: rows, total: rows.length });
});

app.post('/purchases', async (req, res) => {
  const { tenant_id, vendor_id, items = [], expected_date, notes } = req.body;
  const total  = (items as any[]).reduce((s: number, i: any) => s + i.qty * i.unit_price, 0);
  const po_num = `PO-${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO purchase_orders (tenant_id,vendor_id,po_number,items,total_value,expected_date,notes,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'DRAFT') RETURNING *`,
    [tenant_id, vendor_id, po_num, JSON.stringify(items), total, expected_date, notes ?? null]
  );
  res.status(201).json(rows[0]);
});

app.patch('/purchases/:id/approve', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE purchase_orders SET status='APPROVED',approved_at=NOW() WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'PO not found' });
  res.json(rows[0]);
});

// Render assigns $PORT dynamically; PORT_ERP used for local Docker
const PORT = Number(process.env.PORT ?? process.env.PORT_ERP ?? 4001);
app.listen(PORT, '0.0.0.0', () =>
  console.log(`\x1b[35m[erp-service]\x1b[0m Listening on :${PORT}`)
);
