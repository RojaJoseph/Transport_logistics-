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
redis.connect().catch(() => console.warn('[orders] Redis unavailable'));

app.use(helmet()); app.use(cors()); app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'orders' }));

async function nextOrderNumber(): Promise<string> {
  try { return `ORD-${String(await redis.incr('transport:order:seq')).padStart(5,'0')}`; }
  catch { const { rows } = await pool.query('SELECT COUNT(*)+1 AS n FROM orders'); return `ORD-${String(parseInt(rows[0].n)).padStart(5,'0')}`; }
}

app.get('/', async (req, res) => {
  const { status, customer, page='1', limit='20' } = req.query as Record<string,string>;
  const conds: string[] = [], params: any[] = [];
  if (status)   { conds.push(`status=$${params.length+1}`);              params.push(status); }
  if (customer) { conds.push(`customer_name ILIKE $${params.length+1}`); params.push(`%${customer}%`); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit),100), off = (parseInt(page)-1)*lim;
  const [{ rows: data }, { rows:[{count}] }] = await Promise.all([
    pool.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params,lim,off]),
    pool.query(`SELECT COUNT(*) FROM orders ${where}`, params),
  ]);
  res.json({ data, total: parseInt(count), page: parseInt(page), pages: Math.ceil(parseInt(count)/lim) });
});

app.get('/:id', async (req, res) => {
  const { rows:[order] } = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const { rows: events } = await pool.query('SELECT * FROM order_events WHERE order_id=$1 ORDER BY created_at DESC', [req.params.id]);
  res.json({ ...order, events });
});

app.post('/', async (req, res) => {
  const { tenant_id, customer_name, origin_city, dest_city, items=[], priority='standard', sla_date, notes, weight_kg, volume_cbm } = req.body;
  if (!tenant_id || !customer_name || !origin_city || !dest_city) return res.status(400).json({ error: 'tenant_id, customer_name, origin_city, dest_city required' });
  const total_value = (items as any[]).reduce((s:number,i:any)=>s+i.qty*i.unit_price,0);
  const total_items = (items as any[]).reduce((s:number,i:any)=>s+i.qty,0);
  const order_number = await nextOrderNumber();
  const { rows:[order] } = await pool.query(
    `INSERT INTO orders (tenant_id,order_number,customer_name,origin_city,dest_city,items,total_items,total_value,weight_kg,volume_cbm,priority,sla_date,notes,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'PENDING') RETURNING *`,
    [tenant_id,order_number,customer_name,origin_city,dest_city,JSON.stringify(items),total_items,total_value,weight_kg??null,volume_cbm??null,priority,sla_date??null,notes??null]
  );
  res.status(201).json(order);
});

app.patch('/:id/status', async (req, res) => {
  const { status, note } = req.body;
  const VALID = ['PENDING','CONFIRMED','IN_TRANSIT','DELIVERED','CANCELLED'];
  if (!VALID.includes(status)) return res.status(400).json({ error: `status must be: ${VALID.join(', ')}` });
  const { rows:[order] } = await pool.query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [status,req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  pool.query('INSERT INTO order_events (order_id,event_type,description) VALUES ($1,$2,$3)',[req.params.id,`STATUS_${status}`,note??`→ ${status}`]).catch(()=>{});
  res.json(order);
});

app.delete('/:id', async (req, res) => {
  const { rows:[order] } = await pool.query(`UPDATE orders SET status='CANCELLED',updated_at=NOW() WHERE id=$1 AND status NOT IN ('DELIVERED','CANCELLED') RETURNING *`,[req.params.id]);
  if (!order) return res.status(404).json({ error: 'Not found or cannot cancel' });
  res.json({ ok: true, order });
});

const PORT = Number(process.env.PORT ?? process.env.PORT_ORDERS ?? 4007);
async function start() {
  await bootstrapDatabase(pool);
  app.listen(PORT, '0.0.0.0', () => console.log(`[order-service] http://0.0.0.0:${PORT}`));
}
start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
