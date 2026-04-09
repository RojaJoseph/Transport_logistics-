import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import Stripe from 'stripe';

const app  = express();

// ── Database — Docker service name fallback ───────────────────────
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    `postgresql://${process.env.POSTGRES_USER ?? 'logistics'}:${process.env.POSTGRES_PASSWORD ?? 'secret'}@${process.env.POSTGRES_HOST ?? 'postgres'}:${process.env.POSTGRES_PORT ?? 5432}/${process.env.POSTGRES_DB ?? 'logistics'}`,
  max: 10,
});

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
  : null;

// Raw body for Stripe webhooks
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.set('trust proxy', 1);
app.use(helmet()); app.use(cors()); app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'finance', stripe_configured: !!stripe })
);

// ── Invoice number helper ─────────────────────────────────────────
async function nextInvoiceNumber(): Promise<string> {
  const yr = new Date().getFullYear();
  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*) FROM invoices WHERE EXTRACT(YEAR FROM created_at) = $1`, [yr]
  );
  return `INV-${yr}-${String(parseInt(count) + 1).padStart(4, '0')}`;
}

// ── GET /invoices ─────────────────────────────────────────────────
app.get('/invoices', async (req, res) => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit), 100);
  const off = (parseInt(page) - 1) * lim;
  const where  = status ? 'WHERE status=$1' : '';
  const params = status ? [status, lim, off] : [lim, off];
  const idx    = status ? [2, 3] : [1, 2];
  const { rows } = await pool.query(
    `SELECT * FROM invoices ${where} ORDER BY created_at DESC LIMIT $${idx[0]} OFFSET $${idx[1]}`,
    params
  );
  res.json({ data: rows, total: rows.length });
});

// ── GET /invoices/:id ─────────────────────────────────────────────
app.get('/invoices/:id', async (req, res) => {
  const { rows: [inv] } = await pool.query('SELECT * FROM invoices WHERE id=$1', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  const { rows: pmts }  = await pool.query('SELECT * FROM payments WHERE invoice_id=$1', [req.params.id]);
  res.json({ ...inv, payments: pmts });
});

// ── POST /invoices ────────────────────────────────────────────────
app.post('/invoices', async (req, res) => {
  const { tenant_id, customer_name, order_id, line_items = [], due_date, notes, currency = 'INR' } = req.body;
  const subtotal   = (line_items as any[]).reduce((s: number, i: any) => s + i.qty * i.unit_price, 0);
  const tax_amount = (line_items as any[]).reduce((s: number, i: any) => s + (i.qty * i.unit_price * (i.tax_pct ?? 18)) / 100, 0);
  const total      = subtotal + tax_amount;
  const inv_number = await nextInvoiceNumber();

  const { rows: [inv] } = await pool.query(
    `INSERT INTO invoices
       (tenant_id,invoice_number,customer_name,order_id,line_items,subtotal,tax_amount,total_amount,currency,status,due_date,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10,$11) RETURNING *`,
    [tenant_id, inv_number, customer_name, order_id ?? null,
     JSON.stringify(line_items), subtotal, tax_amount, total, currency, due_date, notes ?? null]
  );
  res.status(201).json(inv);
});

// ── PATCH /invoices/:id/mark-paid ─────────────────────────────────
app.patch('/invoices/:id/mark-paid', async (req, res) => {
  const { rows: [inv] } = await pool.query(
    `UPDATE invoices SET status='PAID',paid_at=NOW(),payment_ref=$1,updated_at=NOW() WHERE id=$2 RETURNING *`,
    [req.body.payment_ref ?? 'manual', req.params.id]
  );
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.json(inv);
});

// ── POST /invoices/:id/payment-intent (Stripe) ────────────────────
app.post('/invoices/:id/payment-intent', async (req, res) => {
  const { rows: [inv] } = await pool.query('SELECT * FROM invoices WHERE id=$1', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  if (!stripe) return res.json({ demo: true, message: 'Set STRIPE_SECRET_KEY in .env to enable live payments' });

  const intent = await stripe.paymentIntents.create({
    amount:   Math.round(inv.total_amount * 100),
    currency: inv.currency.toLowerCase(),
    metadata: { invoice_id: inv.id, invoice_number: inv.invoice_number },
  });
  res.json({ client_secret: intent.client_secret, intent_id: intent.id });
});

// ── POST /webhooks/stripe ─────────────────────────────────────────
app.post('/webhooks/stripe', async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET)
    return res.json({ received: true, note: 'Stripe not configured' });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, req.headers['stripe-signature'] as string, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch { return res.status(400).json({ error: 'Webhook signature invalid' }); }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = intent.metadata.invoice_id;
    if (invoiceId) {
      await pool.query(
        `UPDATE invoices SET status='PAID',paid_at=NOW(),payment_ref=$1,updated_at=NOW() WHERE id=$2`,
        [intent.id, invoiceId]
      );
      await pool.query(
        `INSERT INTO payments (invoice_id,amount,currency,method,status,gateway,gateway_txn_id)
         VALUES ($1,$2,$3,'card','SUCCESS','stripe',$4)`,
        [invoiceId, intent.amount / 100, intent.currency.toUpperCase(), intent.id]
      );
    }
  }
  res.json({ received: true });
});

// ── GET /summary ──────────────────────────────────────────────────
app.get('/summary', async (_req, res) => {
  const { rows: [s] } = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN status='PAID'    THEN total_amount ELSE 0 END),0) AS revenue_paid,
      COALESCE(SUM(CASE WHEN status='PENDING' THEN total_amount ELSE 0 END),0) AS revenue_pending,
      COALESCE(SUM(CASE WHEN status='OVERDUE' THEN total_amount ELSE 0 END),0) AS revenue_overdue,
      COUNT(*) AS total_invoices,
      COUNT(CASE WHEN status='PAID' THEN 1 END) AS paid_count
    FROM invoices
    WHERE created_at >= DATE_TRUNC('month', NOW())`);
  res.json(s);
});

// Render assigns $PORT dynamically; PORT_FINANCE used for local Docker
const PORT = Number(process.env.PORT ?? process.env.PORT_FINANCE ?? 4006);
app.listen(PORT, '0.0.0.0', () =>
  console.log(`\x1b[33m[finance-service]\x1b[0m Listening on :${PORT}`)
);
