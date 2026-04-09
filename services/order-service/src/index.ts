import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { z } from 'zod';

const app  = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
const redis = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379', {
  lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1,
});
redis.connect().catch(() => console.warn('[orders] Redis unavailable — sequence falls back to DB count'));

app.use(helmet()); app.use(cors()); app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'orders', ts: new Date().toISOString() })
);

async function nextOrderNumber(): Promise<string> {
  try {
    const n = await redis.incr('transport:order:seq');
    return `ORD-${String(n).padStart(5, '0')}`;
  } catch {
    const { rows } = await pool.query('SELECT COUNT(*) + 1 AS n FROM orders');
    return `ORD-${String(parseInt(rows[0].n)).padStart(5, '0')}`;
  }
}

const CreateSchema = z.object({
  customer_name:  z.string().min(2),
  customer_id:    z.string().uuid().optional(),
  origin_city:    z.string().min(2),
  dest_city:      z.string().min(2),
  origin_address: z.string().optional(),
  dest_address:   z.string().optional(),
  items:          z.array(z.object({
    sku: z.string(), name: z.string(),
    qty: z.number().int().positive(), unit_price: z.number().positive(),
  })),
  weight_kg:  z.number().positive().optional(),
  volume_cbm: z.number().positive().optional(),
  priority:   z.enum(['economy', 'standard', 'express']).default('standard'),
  sla_date:   z.string().optional(),
  notes:      z.string().optional(),
  tenant_id:  z.string().uuid(),
});

app.get('/', async (req, res) => {
  const { status, customer, priority, page = '1', limit = '20' } = req.query as Record<string, string>;
  const conds: string[] = []; const params: any[] = [];
  if (status)   { conds.push(`status=$${params.length+1}`);              params.push(status); }
  if (customer) { conds.push(`customer_name ILIKE $${params.length+1}`); params.push(`%${customer}%`); }
  if (priority) { conds.push(`priority=$${params.length+1}`);            params.push(priority); }
  const where  = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const lim    = Math.min(parseInt(limit), 100);
  const offset = (parseInt(page) - 1) * lim;
  const [{ rows: data }, { rows: [{ count }] }] = await Promise.all([
    pool.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, lim, offset]),
    pool.query(`SELECT COUNT(*) FROM orders ${where}`, params),
  ]);
  res.json({ data, total: parseInt(count), page: parseInt(page), pages: Math.ceil(parseInt(count)/lim) });
});

app.get('/:id', async (req, res) => {
  const { rows: [order] } = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const { rows: events } = await pool.query(
    'SELECT * FROM order_events WHERE order_id=$1 ORDER BY created_at DESC', [req.params.id]
  );
  res.json({ ...order, events });
});

app.post('/', async (req, res) => {
  const p = CreateSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const d = p.data;
  const total_value  = d.items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const total_items  = d.items.reduce((s, i) => s + i.qty, 0);
  const order_number = await nextOrderNumber();
  const { rows: [order] } = await pool.query(
    `INSERT INTO orders
       (tenant_id,order_number,customer_name,customer_id,origin_city,dest_city,origin_address,dest_address,
        items,total_items,total_value,weight_kg,volume_cbm,priority,sla_date,notes,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'PENDING') RETURNING *`,
    [d.tenant_id, order_number, d.customer_name, d.customer_id ?? null,
     d.origin_city, d.dest_city, d.origin_address ?? null, d.dest_address ?? null,
     JSON.stringify(d.items), total_items, total_value,
     d.weight_kg ?? null, d.volume_cbm ?? null, d.priority, d.sla_date ?? null, d.notes ?? null]
  );
  res.status(201).json(order);
});

app.patch('/:id/status', async (req, res) => {
  const { status, note } = req.body;
  const VALID = ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
  if (!VALID.includes(status))
    return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });
  const { rows: [order] } = await pool.query(
    'UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',
    [status, req.params.id]
  );
  if (!order) return res.status(404).json({ error: 'Order not found' });
  await pool.query(
    'INSERT INTO order_events (order_id,event_type,description) VALUES ($1,$2,$3)',
    [req.params.id, `STATUS_${status}`, note ?? `Status changed to ${status}`]
  );
  res.json(order);
});

app.delete('/:id', async (req, res) => {
  const { rows: [order] } = await pool.query(
    `UPDATE orders SET status='CANCELLED',updated_at=NOW()
     WHERE id=$1 AND status NOT IN ('DELIVERED','CANCELLED') RETURNING *`,
    [req.params.id]
  );
  if (!order) return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
  res.json({ ok: true, order });
});

const PORT = Number(process.env.PORT ?? 4007);
app.listen(PORT, '0.0.0.0', () =>
  console.log(`[order-service] Listening on port ${PORT}`)
);
