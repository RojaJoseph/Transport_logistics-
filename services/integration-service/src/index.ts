import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import axios from 'axios';
import crypto from 'crypto';
import { bootstrapDatabase } from './db-bootstrap';

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false });

app.use(helmet()); app.use(cors()); app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'integrations' }));

app.get('/connectors', async (_req, res) => {
  const { rows } = await pool.query('SELECT id,name,type,protocol,status,last_sync,active FROM integrations ORDER BY name');
  res.json({ data: rows, total: rows.length });
});
app.post('/connectors', async (req, res) => {
  const { tenant_id, name, type, protocol, config } = req.body;
  const { rows:[row] } = await pool.query(
    `INSERT INTO integrations (tenant_id,name,type,protocol,config,status) VALUES ($1,$2,$3,$4,$5,'PENDING') RETURNING *`,
    [tenant_id,name,type,protocol??'REST',JSON.stringify(config??{})]
  );
  res.status(201).json(row);
});
app.patch('/connectors/:id/test', async (req, res) => {
  const { rows:[conn] } = await pool.query('SELECT * FROM integrations WHERE id=$1',[req.params.id]);
  if (!conn) return res.status(404).json({ error: 'Not found' });
  let status='CONNECTED', error_msg=null;
  try { if (conn.config?.api_url) await axios.get(conn.config.api_url,{timeout:5000}); }
  catch(e:any) { status='ERROR'; error_msg=e.message; }
  const { rows:[updated] } = await pool.query('UPDATE integrations SET status=$1,error_msg=$2,last_sync=NOW(),updated_at=NOW() WHERE id=$3 RETURNING *',[status,error_msg,req.params.id]);
  res.json({ status, connector: updated });
});

app.post('/carriers/:carrier/shipment', async (req, res) => {
  const awb = `${req.params.carrier.toUpperCase().slice(0,3)}${Date.now().toString().slice(-9)}`;
  pool.query(`INSERT INTO integration_events (integration_id,event_type,direction,payload,status) SELECT id,'SHIPMENT_CREATE','OUT',$1,'SUCCESS' FROM integrations WHERE name ILIKE $2 LIMIT 1`,[JSON.stringify(req.body),`%${req.params.carrier}%`]).catch(()=>{});
  res.json({ awb, carrier:req.params.carrier, status:'CREATED' });
});
app.get('/carriers/:carrier/track/:awb', (req, res) => {
  res.json({ awb:req.params.awb, carrier:req.params.carrier, events:[
    { ts:new Date(Date.now()-7200000).toISOString(), location:'Origin Hub',   status:'PICKED_UP'   },
    { ts:new Date(Date.now()-3600000).toISOString(), location:'Transit Hub',  status:'IN_TRANSIT'  },
    { ts:new Date().toISOString(),                   location:'Out for Delivery', status:'OUT_FOR_DELIVERY' },
  ]});
});

const webhooks: { id:string; url:string; events:string[]; secret:string }[] = [];
app.get('/webhooks', (_req, res) => res.json({ data: webhooks.map(({secret:_s,...h})=>h) }));
app.post('/webhooks', (req, res) => {
  const { url, events } = req.body;
  if (!url || !events?.length) return res.status(400).json({ error: 'url and events required' });
  const hook = { id:crypto.randomUUID(), url, events, secret:crypto.randomBytes(20).toString('hex') };
  webhooks.push(hook);
  res.status(201).json(hook);
});

app.get('/events', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ie.*,i.name AS integration_name FROM integration_events ie LEFT JOIN integrations i ON i.id=ie.integration_id ORDER BY ie.created_at DESC LIMIT $1`,
    [parseInt(req.query.limit as string)||50]
  );
  res.json({ data: rows, total: rows.length });
});

const PORT = Number(process.env.PORT ?? process.env.PORT_INTEGRATE ?? 4009);
async function start() {
  await bootstrapDatabase(pool);
  app.listen(PORT, '0.0.0.0', () => console.log(`[integration-service] http://0.0.0.0:${PORT}`));
}
start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
