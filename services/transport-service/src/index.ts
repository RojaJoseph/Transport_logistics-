import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { bootstrapDatabase } from '../../shared/db-bootstrap';

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false });

app.use(helmet()); app.use(cors()); app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'transport' }));

app.get('/', async (req, res) => {
  const { status, mode, page='1', limit='20' } = req.query as Record<string,string>;
  const conds: string[] = [], params: any[] = [];
  if (status) { conds.push(`status=$${params.length+1}`);         params.push(status); }
  if (mode)   { conds.push(`transport_mode=$${params.length+1}`); params.push(mode); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit),100), off = (parseInt(page)-1)*lim;
  const [{ rows: data }, { rows:[{count}] }] = await Promise.all([
    pool.query(`SELECT * FROM shipments ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params,lim,off]),
    pool.query(`SELECT COUNT(*) FROM shipments ${where}`, params),
  ]);
  res.json({ data, total: parseInt(count) });
});

app.get('/stats/summary', async (_req, res) => {
  const [{ rows: byStatus }, { rows: byMode }] = await Promise.all([
    pool.query('SELECT status, COUNT(*) AS count FROM shipments GROUP BY status ORDER BY count DESC'),
    pool.query('SELECT transport_mode, COUNT(*) AS count FROM shipments GROUP BY transport_mode ORDER BY count DESC'),
  ]);
  res.json({ by_status: byStatus, by_mode: byMode });
});

app.get('/:id', async (req, res) => {
  const { rows:[s] } = await pool.query('SELECT * FROM shipments WHERE id=$1', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  res.json(s);
});

app.post('/', async (req, res) => {
  const { tenant_id, carrier_name, transport_mode='Road', vehicle_reg, device_id, origin_city, dest_city, order_id, eta } = req.body;
  if (!tenant_id || !carrier_name || !origin_city || !dest_city) return res.status(400).json({ error: 'Missing required fields' });
  const num = `SHP-${new Date().getFullYear()}-${Math.floor(10000+Math.random()*90000)}`;
  const { rows:[s] } = await pool.query(
    `INSERT INTO shipments (tenant_id,shipment_number,order_id,carrier_name,transport_mode,vehicle_reg,device_id,origin_city,dest_city,status,eta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10) RETURNING *`,
    [tenant_id,num,order_id??null,carrier_name,transport_mode,vehicle_reg??null,device_id??null,origin_city,dest_city,eta?new Date(eta):null]
  );
  res.status(201).json(s);
});

app.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const VALID = ['PENDING','IN_TRANSIT','DELAYED','DELIVERED','CANCELLED'];
  if (!VALID.includes(status)) return res.status(400).json({ error: `Must be: ${VALID.join(', ')}` });
  const extra = status==='IN_TRANSIT' ? ',departed_at=NOW()' : status==='DELIVERED' ? ',delivered_at=NOW()' : '';
  const { rows:[s] } = await pool.query(`UPDATE shipments SET status=$1,updated_at=NOW()${extra} WHERE id=$2 RETURNING *`, [status,req.params.id]);
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  res.json(s);
});

app.patch('/:id/assign-device', async (req, res) => {
  const { device_id, vehicle_reg } = req.body;
  const { rows:[s] } = await pool.query('UPDATE shipments SET device_id=$1,vehicle_reg=$2,updated_at=NOW() WHERE id=$3 RETURNING *', [device_id,vehicle_reg,req.params.id]);
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  res.json(s);
});

const PORT = Number(process.env.PORT ?? process.env.PORT_TRANSPORT ?? 4002);
async function start() {
  await bootstrapDatabase(pool);
  app.listen(PORT, '0.0.0.0', () => console.log(`[transport-service] http://0.0.0.0:${PORT}`));
}
start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
