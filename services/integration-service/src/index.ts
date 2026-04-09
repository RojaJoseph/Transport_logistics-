import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import axios from 'axios';
import crypto from 'crypto';

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
  res.json({ status: 'ok', service: 'integrations', ts: new Date().toISOString() })
);

// ── Connector CRUD ────────────────────────────────────────────────
app.get('/connectors', async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id,name,type,protocol,status,last_sync,active FROM integrations ORDER BY name'
  );
  res.json({ data: rows, total: rows.length });
});

app.post('/connectors', async (req, res) => {
  const { tenant_id, name, type, protocol, config } = req.body;
  if (!tenant_id || !name || !type)
    return res.status(400).json({ error: 'tenant_id, name, type required' });
  const { rows: [row] } = await pool.query(
    `INSERT INTO integrations (tenant_id,name,type,protocol,config,status)
     VALUES ($1,$2,$3,$4,$5,'PENDING') RETURNING *`,
    [tenant_id, name, type, protocol ?? 'REST', JSON.stringify(config ?? {})]
  );
  res.status(201).json(row);
});

app.patch('/connectors/:id/test', async (req, res) => {
  const { rows: [conn] } = await pool.query('SELECT * FROM integrations WHERE id=$1', [req.params.id]);
  if (!conn) return res.status(404).json({ error: 'Connector not found' });

  let status = 'CONNECTED', error_msg = null;
  try {
    if (conn.config?.api_url) {
      await axios.get(conn.config.api_url, {
        timeout: 5000,
        headers: conn.config.api_key ? { Authorization: `Bearer ${conn.config.api_key}` } : {},
      });
    }
  } catch (e: any) { status = 'ERROR'; error_msg = e.message; }

  const { rows: [updated] } = await pool.query(
    'UPDATE integrations SET status=$1,error_msg=$2,last_sync=NOW(),updated_at=NOW() WHERE id=$3 RETURNING *',
    [status, error_msg, req.params.id]
  );
  res.json({ status, connector: updated });
});

// ── Carrier adapter ───────────────────────────────────────────────
app.post('/carriers/:carrier/shipment', async (req, res) => {
  const { carrier } = req.params;
  const awb = `${carrier.toUpperCase().slice(0, 3)}${Date.now().toString().slice(-9)}`;

  pool.query(
    `INSERT INTO integration_events (integration_id,event_type,direction,payload,status)
     SELECT id,'SHIPMENT_CREATE','OUT',$1,'SUCCESS' FROM integrations WHERE name ILIKE $2 LIMIT 1`,
    [JSON.stringify(req.body), `%${carrier}%`]
  ).catch(() => {});

  pool.query(
    `UPDATE integrations SET last_sync=NOW() WHERE name ILIKE $1`, [`%${carrier}%`]
  ).catch(() => {});

  res.json({
    awb, carrier, status: 'CREATED',
    tracking_url: `https://track.${carrier.toLowerCase()}.com/${awb}`,
    message: 'Demo mode — production will call real carrier API',
  });
});

app.get('/carriers/:carrier/track/:awb', (req, res) => {
  res.json({
    awb: req.params.awb,
    carrier: req.params.carrier,
    events: [
      { ts: new Date(Date.now() - 7200000).toISOString(), location: 'Origin Hub',       status: 'PICKED_UP' },
      { ts: new Date(Date.now() - 3600000).toISOString(), location: 'Transit Hub',      status: 'IN_TRANSIT' },
      { ts: new Date().toISOString(),                     location: 'Out for Delivery',  status: 'OUT_FOR_DELIVERY' },
    ],
    estimated_delivery: new Date(Date.now() + 86400 * 1000).toISOString(),
  });
});

// ── EDI parser ────────────────────────────────────────────────────
app.post('/edi/inbound', async (req, res) => {
  const { content, format = 'X12', partner_id } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const lines    = content.split('~').map((l: string) => l.trim()).filter(Boolean);
  const segments: Record<string, string[]> = {};
  lines.forEach((line: string) => {
    const parts = line.split('*');
    segments[parts[0]] = parts.slice(1);
  });

  res.json({
    ok: true,
    canonical: {
      type: 'PURCHASE_ORDER', format, partner_id,
      po_number: segments['BEG']?.[2] ?? 'UNKNOWN',
      po_date:   segments['BEG']?.[4] ?? '',
      items:     [],
      raw_segments: segments,
    },
  });
});

// ── Webhooks ──────────────────────────────────────────────────────
const webhooks: { id: string; url: string; events: string[]; secret: string }[] = [];

app.get('/webhooks', (_req, res) =>
  res.json({ data: webhooks.map(({ secret: _s, ...h }) => h), total: webhooks.length })
);

app.post('/webhooks', (req, res) => {
  const { url, events } = req.body;
  if (!url || !events?.length) return res.status(400).json({ error: 'url and events required' });
  const hook = { id: crypto.randomUUID(), url, events, secret: crypto.randomBytes(20).toString('hex') };
  webhooks.push(hook);
  res.status(201).json(hook);
});

app.post('/webhooks/fire', async (req, res) => {
  const { event, payload } = req.body;
  const targets = webhooks.filter(h => h.events.includes(event) || h.events.includes('*'));
  const results = await Promise.allSettled(
    targets.map(async hook => {
      const sig = crypto.createHmac('sha256', hook.secret)
        .update(JSON.stringify(payload)).digest('hex');
      await axios.post(hook.url, payload, {
        headers: { 'X-TransportOS-Signature': `sha256=${sig}`, 'X-Event-Type': event },
        timeout: 10_000,
      });
    })
  );
  res.json({ fired: targets.length, results: results.map(r => r.status) });
});

// ── Event log ─────────────────────────────────────────────────────
app.get('/events', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const { rows } = await pool.query(
    `SELECT ie.*, i.name AS integration_name
     FROM integration_events ie
     LEFT JOIN integrations i ON i.id = ie.integration_id
     ORDER BY ie.created_at DESC LIMIT $1`,
    [limit]
  );
  res.json({ data: rows, total: rows.length });
});

// Render assigns $PORT dynamically; PORT_INTEGRATE used for local Docker
const PORT = Number(process.env.PORT ?? process.env.PORT_INTEGRATE ?? 4009);
app.listen(PORT, '0.0.0.0', () =>
  console.log(`\x1b[35m[integration-service]\x1b[0m Listening on :${PORT}`)
);
