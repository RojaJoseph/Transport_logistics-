import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { bootstrapDatabase } from './db-bootstrap';

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false });

app.use(helmet()); app.use(cors());
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'finance' }));

async function nextInvoiceNumber(): Promise<string> {
  const yr = new Date().getFullYear();
  const { rows:[{count}] } = await pool.query(`SELECT COUNT(*) FROM invoices WHERE EXTRACT(YEAR FROM created_at)=$1`, [yr]);
  return `INV-${yr}-${String(parseInt(count)+1).padStart(4,'0')}`;
}

app.get('/invoices', async (req, res) => {
  const { status, page='1', limit='20' } = req.query as Record<string,string>;
  const lim=Math.min(parseInt(limit),100), off=(parseInt(page)-1)*lim;
  const where=status?'WHERE status=$1':'';
  const params=status?[status,lim,off]:[lim,off];
  const idx=status?[2,3]:[1,2];
  const { rows } = await pool.query(`SELECT * FROM invoices ${where} ORDER BY created_at DESC LIMIT $${idx[0]} OFFSET $${idx[1]}`, params);
  res.json({ data: rows, total: rows.length });
});

app.get('/invoices/:id', async (req, res) => {
  const { rows:[inv] } = await pool.query('SELECT * FROM invoices WHERE id=$1', [req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  const { rows:pmts } = await pool.query('SELECT * FROM payments WHERE invoice_id=$1', [req.params.id]);
  res.json({ ...inv, payments: pmts });
});

app.post('/invoices', async (req, res) => {
  const { tenant_id, customer_name, order_id, line_items=[], due_date, notes, currency='INR' } = req.body;
  const subtotal   = (line_items as any[]).reduce((s:number,i:any)=>s+i.qty*i.unit_price,0);
  const tax_amount = (line_items as any[]).reduce((s:number,i:any)=>s+(i.qty*i.unit_price*(i.tax_pct??18))/100,0);
  const inv_number = await nextInvoiceNumber();
  const { rows:[inv] } = await pool.query(
    `INSERT INTO invoices (tenant_id,invoice_number,customer_name,order_id,line_items,subtotal,tax_amount,total_amount,currency,status,due_date,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10,$11) RETURNING *`,
    [tenant_id,inv_number,customer_name,order_id??null,JSON.stringify(line_items),subtotal,tax_amount,subtotal+tax_amount,currency,due_date,notes??null]
  );
  res.status(201).json(inv);
});

app.patch('/invoices/:id/mark-paid', async (req, res) => {
  const { rows:[inv] } = await pool.query(`UPDATE invoices SET status='PAID',paid_at=NOW(),payment_ref=$1,updated_at=NOW() WHERE id=$2 RETURNING *`, [req.body.payment_ref??'manual',req.params.id]);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.json(inv);
});

app.get('/summary', async (_req, res) => {
  const { rows:[s] } = await pool.query(`
    SELECT COALESCE(SUM(CASE WHEN status='PAID' THEN total_amount ELSE 0 END),0) AS revenue_paid,
           COALESCE(SUM(CASE WHEN status='PENDING' THEN total_amount ELSE 0 END),0) AS revenue_pending,
           COALESCE(SUM(CASE WHEN status='OVERDUE' THEN total_amount ELSE 0 END),0) AS revenue_overdue,
           COUNT(*) AS total_invoices
    FROM invoices WHERE created_at>=DATE_TRUNC('month',NOW())`);
  res.json(s);
});

const PORT = Number(process.env.PORT ?? process.env.PORT_FINANCE ?? 4006);
async function start() {
  await bootstrapDatabase(pool);
  app.listen(PORT, '0.0.0.0', () => console.log(`[finance-service] http://0.0.0.0:${PORT}`));
}
start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
