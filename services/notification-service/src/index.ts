import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { bootstrapDatabase } from '../../shared/db-bootstrap';

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false });
const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
redis.connect().catch(() => console.warn('[notify] Redis unavailable'));

app.use(helmet()); app.use(cors()); app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notifications' }));

function render(tmpl: string, vars: Record<string,string>) {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_,k) => vars[k]??`{{${k}}}`);
}

async function sendEmail(to:string, subject:string, body:string) {
  if (!process.env.SENDGRID_API_KEY) { console.log(`[notify:email] DEMO → ${to}: ${subject}`); return; }
  const sg = require('@sendgrid/mail');
  sg.setApiKey(process.env.SENDGRID_API_KEY);
  await sg.send({ to, from: process.env.SENDGRID_FROM_EMAIL!, subject, text: body });
}
async function sendSMS(to:string, body:string) {
  if (!process.env.TWILIO_ACCOUNT_SID) { console.log(`[notify:sms] DEMO → ${to}: ${body}`); return; }
  const tw = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await tw.messages.create({ to, from: process.env.TWILIO_PHONE_NUMBER!, body });
}

app.post('/send', async (req, res) => {
  const { templateCode, recipients=[], vars={}, channels=[], tenant_id } = req.body;
  if (!templateCode || !recipients.length) return res.status(400).json({ error: 'templateCode and recipients required' });
  try {
    const { rows:[tpl] } = await pool.query('SELECT * FROM notification_templates WHERE code=$1 AND active=TRUE', [templateCode]);
    if (!tpl) return res.status(404).json({ error: `Template '${templateCode}' not found` });
    const subject = render(tpl.subject_tpl??'', vars);
    const body    = render(tpl.body_tpl, vars);
    const chs: string[] = channels.length ? channels : tpl.channels;
    for (const r of recipients) {
      for (const ch of chs) {
        let status='SENT', error_msg=null;
        try {
          if (ch==='email'  && r.email)  await sendEmail(r.email, subject, body);
          if (ch==='sms'    && r.phone)  await sendSMS(r.phone, body);
          if (ch==='in-app' && r.userId) { await redis.lpush(`notif:user:${r.userId}`, JSON.stringify({title:subject,body,code:templateCode,ts:Date.now()})).catch(()=>{}); }
        } catch(e:any) { status='FAILED'; error_msg=e.message; }
        pool.query('INSERT INTO notification_log (tenant_id,template_id,channel,recipient,subject,body,status,error_msg) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [tenant_id??null,tpl.id,ch,r.email??r.phone??r.userId??'unknown',subject,body,status,error_msg]).catch(()=>{});
      }
    }
    res.json({ ok: true, sent: recipients.length });
  } catch(err:any) { res.status(500).json({ error: err.message }); }
});

app.get('/user/:userId', async (req, res) => {
  const raw = await redis.lrange(`notif:user:${req.params.userId}`, 0, 49).catch(()=>[] as string[]);
  res.json({ data: raw.map(r=>JSON.parse(r)) });
});
app.get('/log', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT $1', [parseInt(req.query.limit as string)||50]);
  res.json({ data: rows, total: rows.length });
});
app.get('/templates', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM notification_templates WHERE active=TRUE ORDER BY name');
  res.json({ data: rows, total: rows.length });
});

const PORT = Number(process.env.PORT ?? process.env.PORT_NOTIFY ?? 4008);
async function start() {
  await bootstrapDatabase(pool);
  app.listen(PORT, '0.0.0.0', () => console.log(`[notification-service] http://0.0.0.0:${PORT}`));
}
start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
