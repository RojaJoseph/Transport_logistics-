import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { z } from 'zod';

const app  = express();

// ── Database — Docker service name fallback ───────────────────────
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    `postgresql://${process.env.POSTGRES_USER ?? 'logistics'}:${process.env.POSTGRES_PASSWORD ?? 'secret'}@${process.env.POSTGRES_HOST ?? 'postgres'}:${process.env.POSTGRES_PORT ?? 5432}/${process.env.POSTGRES_DB ?? 'logistics'}`,
  max: 10,
});

app.set('trust proxy', 1);
app.use(helmet()); app.use(cors()); app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'transport', ts: new Date().toISOString() })
);

// ── Shipments ─────────────────────────────────────────────────────
const ShipmentSchema = z.object({
  tenant_id:      z.string().uuid(),
  order_id:       z.string().uuid().optional(),
  carrier_name:   z.string().min(2),
  carrier_awb:    z.string().optional(),
  transport_mode: z.enum(['Road','Rail','Air','Sea']).default('Road'),
  vehicle_reg:    z.string().optional(),
  device_id:      z.string().optional(),
  origin_city:    z.string().min(2),
  dest_city:      z.string().min(2),
  eta:            z.string().optional(),
});

app.get('/', async (req, res) => {
  const { status, mode, carrier, page = '1', limit = '20' } = req.query as Record<string, string>;
  const conds: string[] = []; const params: any[] = [];
  if (status)  { conds.push(`status=$${params.length+1}`);             params.push(status); }
  if (mode)    { conds.push(`transport_mode=$${params.length+1}`);      params.push(mode); }
  if (carrier) { conds.push(`carrier_name ILIKE $${params.length+1}`);  params.push(`%${carrier}%`); }
  const where  = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const lim    = Math.min(parseInt(limit), 100);
  const offset = (parseInt(page) - 1) * lim;
  const [{ rows: data }, { rows: [{ count }] }] = await Promise.all([
    pool.query(`SELECT * FROM shipments ${where} ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, lim, offset]),
    pool.query(`SELECT COUNT(*) FROM shipments ${where}`, params),
  ]);
  res.json({ data, total: parseInt(count), page: parseInt(page), pages: Math.ceil(parseInt(count)/lim) });
});

app.get('/stats/summary', async (_req, res) => {
  const [{ rows: byStatus }, { rows: byMode }] = await Promise.all([
    pool.query('SELECT status, COUNT(*) AS count FROM shipments GROUP BY status ORDER BY count DESC'),
    pool.query('SELECT transport_mode, COUNT(*) AS count FROM shipments GROUP BY transport_mode ORDER BY count DESC'),
  ]);
  res.json({ by_status: byStatus, by_mode: byMode });
});

app.get('/:id', async (req, res) => {
  const { rows: [s] } = await pool.query('SELECT * FROM shipments WHERE id=$1', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  res.json(s);
});

app.post('/', async (req, res) => {
  const p = ShipmentSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const d = p.data;
  const num = `SHP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const { rows: [s] } = await pool.query(
    `INSERT INTO shipments
       (tenant_id,shipment_number,order_id,carrier_name,carrier_awb,transport_mode,vehicle_reg,device_id,origin_city,dest_city,status,eta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING',$11) RETURNING *`,
    [d.tenant_id, num, d.order_id ?? null, d.carrier_name, d.carrier_awb ?? null,
     d.transport_mode, d.vehicle_reg ?? null, d.device_id ?? null,
     d.origin_city, d.dest_city, d.eta ? new Date(d.eta) : null]
  );
  res.status(201).json(s);
});

app.patch('/:id/status', async (req, res) => {
  const { status, note } = req.body;
  const VALID = ['PENDING','IN_TRANSIT','DELAYED','DELIVERED','CANCELLED'];
  if (!VALID.includes(status)) return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });
  const extra = status === 'IN_TRANSIT' ? ', departed_at = NOW()'
              : status === 'DELIVERED'  ? ', delivered_at = NOW()' : '';
  const { rows: [s] } = await pool.query(
    `UPDATE shipments SET status=$1,updated_at=NOW()${extra} WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  res.json(s);
});

app.patch('/:id/assign-device', async (req, res) => {
  const { device_id, vehicle_reg } = req.body;
  const { rows: [s] } = await pool.query(
    'UPDATE shipments SET device_id=$1,vehicle_reg=$2,updated_at=NOW() WHERE id=$3 RETURNING *',
    [device_id, vehicle_reg, req.params.id]
  );
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  res.json(s);
});

const PORT = Number(process.env.PORT_TRANSPORT ?? 4002);
app.listen(PORT, '0.0.0.0', () =>
  console.log(`\x1b[34m[transport-service]\x1b[0m Listening on :${PORT}`)
);
