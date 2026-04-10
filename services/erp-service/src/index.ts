import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { bootstrapDatabase } from './db-bootstrap';

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false });
const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
redis.connect().catch(() => console.warn('[erp] Redis unavailable'));

app.use(helmet()); app.use(cors()); app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'erp' }));

// ── Inventory ─────────────────────────────────────────────────────
app.get('/inventory', async (_req, res) => {
  try {
    const cache = await redis.get('erp:inventory').catch(() => null);
    if (cache) return res.json(JSON.parse(cache));
    const { rows } = await pool.query(`SELECT i.*, w.name AS warehouse_name FROM inventory i LEFT JOIN warehouses w ON i.warehouse_id=w.id ORDER BY i.updated_at DESC`);
    const result = { data: rows, total: rows.length };
    redis.setex('erp:inventory', 30, JSON.stringify(result)).catch(() => {});
    res.json(result);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});
app.get('/inventory/:sku', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM inventory WHERE sku=$1', [req.params.sku]);
  if (!rows.length) return res.status(404).json({ error: 'SKU not found' });
  res.json(rows[0]);
});
app.post('/inventory', async (req, res) => {
  const { tenant_id, sku, name, qty = 0, unit = 'Units', warehouse_id, unit_cost = 0, reorder_level = 50 } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO inventory (tenant_id,sku,name,qty,unit,warehouse_id,unit_cost,reorder_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [tenant_id, sku, name, qty, unit, warehouse_id ?? null, unit_cost, reorder_level]
  );
  redis.del('erp:inventory').catch(() => {});
  res.status(201).json(rows[0]);
});
app.patch('/inventory/:sku/adjust', async (req, res) => {
  const { delta, reason } = req.body;
  const { rows } = await pool.query('UPDATE inventory SET qty=qty+$1,updated_at=NOW() WHERE sku=$2 RETURNING *', [delta, req.params.sku]);
  if (!rows.length) return res.status(404).json({ error: 'SKU not found' });
  pool.query('INSERT INTO inventory_audit (sku,delta,reason) VALUES ($1,$2,$3)', [req.params.sku, delta, reason]).catch(() => {});
  redis.del('erp:inventory').catch(() => {});
  res.json(rows[0]);
});

// ── Vendors ───────────────────────────────────────────────────────
app.get('/vendors', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM vendors ORDER BY name');
  res.json({ data: rows, total: rows.length });
});
app.post('/vendors', async (req, res) => {
  const { tenant_id, name, gstin, email, phone, address, payment_terms = 30, rating = 3 } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO vendors (tenant_id,name,gstin,email,phone,address,payment_terms,rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [tenant_id, name, gstin ?? null, email ?? null, phone ?? null, address ?? null, payment_terms, rating]
  );
  res.status(201).json(rows[0]);
});
app.patch('/vendors/:id', async (req, res) => {
  const allowed = ['name','email','phone','address','payment_terms','rating','active'];
  const fields  = Object.entries(req.body).filter(([k]) => allowed.includes(k));
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  const sets = fields.map(([k], i) => `${k}=$${i+2}`).join(', ');
  const { rows } = await pool.query(`UPDATE vendors SET ${sets},updated_at=NOW() WHERE id=$1 RETURNING *`, [req.params.id, ...fields.map(([,v]) => v)]);
  if (!rows.length) return res.status(404).json({ error: 'Vendor not found' });
  res.json(rows[0]);
});

// ── Warehouses ────────────────────────────────────────────────────
app.get('/warehouses', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM warehouses ORDER BY name');
  res.json({ data: rows, total: rows.length });
});
app.post('/warehouses', async (req, res) => {
  const { tenant_id, name, city, state, capacity_sqm, type = 'general', lat, lng } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO warehouses (tenant_id,name,city,state,capacity_sqm,type,lat,lng) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [tenant_id, name, city, state, capacity_sqm, type, lat ?? null, lng ?? null]
  );
  res.status(201).json(rows[0]);
});

// ── Purchase Orders ───────────────────────────────────────────────
app.get('/purchases', async (_req, res) => {
  const { rows } = await pool.query(`SELECT po.*, v.name AS vendor_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id=v.id ORDER BY po.created_at DESC`);
  res.json({ data: rows, total: rows.length });
});
app.post('/purchases', async (req, res) => {
  const { tenant_id, vendor_id, items = [], expected_date, notes } = req.body;
  const total = (items as any[]).reduce((s: number, i: any) => s + i.qty * i.unit_price, 0);
  const { rows } = await pool.query(
    `INSERT INTO purchase_orders (tenant_id,vendor_id,po_number,items,total_value,expected_date,notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'DRAFT') RETURNING *`,
    [tenant_id, vendor_id, `PO-${Date.now()}`, JSON.stringify(items), total, expected_date, notes ?? null]
  );
  res.status(201).json(rows[0]);
});

const PORT = Number(process.env.PORT ?? process.env.PORT_ERP ?? 4001);
async function start() {
  await bootstrapDatabase(pool);
  app.listen(PORT, '0.0.0.0', () => console.log(`[erp-service] http://0.0.0.0:${PORT}`));
}
start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
