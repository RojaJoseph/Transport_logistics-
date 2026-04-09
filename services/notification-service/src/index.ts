import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import Redis from 'ioredis';

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
  lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1,
});
redis.connect().catch(() => console.warn('[notify] Redis unavailable — in-app feed disabled'));

app.set('trust proxy', 1);
app.use(helmet()); app.use(cors()); app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'notifications', ts: new Date().toISOString() })
);

function renderTemplate(tmpl: string, vars: Record<string, string>): string {
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`\x1b[35m[notify:email]\x1b[0m DEMO → To: ${to} | ${subject}`);
    return;
  }
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await sgMail.send({
    to, from: process.env.SENDGRID_FROM_EMAIL!, subject, text: body,
    html: `<p style="font-family:sans-serif">${body.replace(/\n/g, '<br>')}</p>`,
  });
}

async function sendSMS(to: string, body: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log(`\x1b[35m[notify:sms]\x1b[0m DEMO → To: ${to} | ${body}`);
    return;
  }
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await twilio.messages.create({ to, from: process.env.TWILIO_PHONE_NUMBER!, body });
}

// ── POST /send — dispatch notification ───────────────────────────
app.post('/send', async (req, res) => {
  const { templateCode, recipients = [], vars = {}, channels = [], tenant_id } = req.body;
  if (!templateCode || !recipients.length)
    return res.status(400).json({ error: 'templateCode and recipients required' });

  try {
    const { rows: [tpl] } = await pool.query(
      'SELECT * FROM notification_templates WHERE code=$1 AND active=TRUE', [templateCode]
    );
    if (!tpl) return res.status(404).json({ error: `Template '${templateCode}' not found` });

    const subject = renderTemplate(tpl.subject_tpl ?? '', vars);
    const body    = renderTemplate(tpl.body_tpl, vars);
    const chs: string[] = channels.length ? channels : tpl.channels;

    for (const r of recipients) {
      for (const ch of chs) {
        let status = 'SENT', error_msg = null;
        try {
          if (ch === 'email'  && r.email)  await sendEmail(r.email, subject, body);
          if (ch === 'sms'    && r.phone)  await sendSMS(r.phone, body);
          if (ch === 'push'   && r.userId) console.log(`[notify:push] DEMO → userId: ${r.userId}`);
          if (ch === 'in-app' && r.userId) {
            await redis.lpush(`notif:user:${r.userId}`,
              JSON.stringify({ title: subject, body, code: templateCode, ts: Date.now() })
            ).catch(() => {});
            await redis.ltrim(`notif:user:${r.userId}`, 0, 99).catch(() => {});
          }
        } catch (err: any) { status = 'FAILED'; error_msg = err.message; }

        await pool.query(
          `INSERT INTO notification_log (tenant_id,template_id,channel,recipient,subject,body,status,error_msg)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [tenant_id ?? null, tpl.id, ch,
           r.email ?? r.phone ?? r.userId ?? 'unknown', subject, body, status, error_msg]
        ).catch(() => {});
      }
    }
    res.json({ ok: true, sent: recipients.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /user/:userId — in-app notification feed ──────────────────
app.get('/user/:userId', async (req, res) => {
  const raw = await redis.lrange(`notif:user:${req.params.userId}`, 0, 49).catch(() => [] as string[]);
  res.json({ data: raw.map(r => JSON.parse(r)) });
});

// ── GET /log ──────────────────────────────────────────────────────
app.get('/log', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const { rows } = await pool.query(
    'SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT $1', [limit]
  );
  res.json({ data: rows, total: rows.length });
});

// ── GET /templates ────────────────────────────────────────────────
app.get('/templates', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM notification_templates WHERE active=TRUE ORDER BY name');
  res.json({ data: rows, total: rows.length });
});

// Render assigns $PORT dynamically; PORT_NOTIFY used for local Docker
const PORT = Number(process.env.PORT ?? process.env.PORT_NOTIFY ?? 4008);
app.listen(PORT, '0.0.0.0', () =>
  console.log(`\x1b[36m[notification-service]\x1b[0m Listening on :${PORT}`)
);
