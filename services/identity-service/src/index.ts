import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { z } from 'zod';

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

app.use(helmet()); app.use(cors()); app.use(express.json());

const JWT_SECRET  = process.env.JWT_SECRET  ?? 'change_this_in_production_minimum_64_chars!!!!!!!!!!!!!!!!!!!!!!!';
const JWT_EXPIRES = (process.env.JWT_EXPIRES ?? '8h') as any;

// ── Health ────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'identity', ts: new Date().toISOString() })
);

// ── Login ─────────────────────────────────────────────────────────
const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
  mfa_code: z.string().optional(),
});

app.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'email and password required' });

  const { email, password, mfa_code } = parsed.data;
  try {
    const { rows } = await pool.query(
      `SELECT u.*,
              array_agg(up.permission) FILTER (WHERE up.permission IS NOT NULL) AS permissions,
              t.slug AS tenant
       FROM users u
       LEFT JOIN user_permissions up ON up.user_id = u.id
       LEFT JOIN tenants t           ON t.id = u.tenant_id
       WHERE u.email = $1 AND u.active = TRUE
       GROUP BY u.id, t.slug`,
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];

    if (user.password_hash) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.mfa_enabled && user.mfa_secret) {
      if (!mfa_code) return res.status(202).json({ mfa_required: true });
      const ok = speakeasy.totp.verify({
        secret: user.mfa_secret, encoding: 'base32', token: mfa_code, window: 1,
      });
      if (!ok) return res.status(401).json({ error: 'Invalid MFA code' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    pool.query(
      `INSERT INTO audit_logs (tenant_id,user_id,user_name,action,detail,ip_address,risk_level)
       VALUES ($1,$2,$3,'USER_LOGIN','Successful login',$4,'low')`,
      [user.tenant_id, user.id, user.name, req.ip]
    ).catch(() => {});

    const token = jwt.sign(
      {
        id: user.id, email: user.email, name: user.name,
        role: user.role, tenant: user.tenant, tenant_id: user.tenant_id,
        permissions: user.permissions ?? [],
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      user: {
        id: user.id, email: user.email, name: user.name,
        role: user.role, tenant: user.tenant ?? 'ENTERPRISE',
        permissions: user.permissions ?? [],
      },
    });
  } catch (err: any) {
    console.error('[identity] login error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── Token refresh ─────────────────────────────────────────────────
app.post('/refresh', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const p: any = jwt.verify(auth.slice(7), JWT_SECRET);
    delete p.iat; delete p.exp;
    res.json({ token: jwt.sign(p, JWT_SECRET, { expiresIn: JWT_EXPIRES }) });
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
});

// ── Users ─────────────────────────────────────────────────────────
app.get('/users', async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.email, u.name, u.role, u.mfa_enabled, u.active, u.last_login,
           array_agg(up.permission) FILTER (WHERE up.permission IS NOT NULL) AS permissions
    FROM users u LEFT JOIN user_permissions up ON up.user_id = u.id
    GROUP BY u.id ORDER BY u.name`);
  res.json({ data: rows, total: rows.length });
});

app.post('/users', async (req, res) => {
  const { email, name, role, tenant_id, password } = req.body;
  const hash = password ? await bcrypt.hash(password, 12) : null;
  const { rows } = await pool.query(
    `INSERT INTO users (tenant_id,email,name,role,password_hash)
     VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role`,
    [tenant_id, email, name, role ?? 'LOGISTICS_EXEC', hash]
  );
  res.status(201).json(rows[0]);
});

app.patch('/users/:id/role', async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE users SET role=$1,updated_at=NOW() WHERE id=$2 RETURNING id,email,name,role',
    [req.body.role, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

app.patch('/users/:id/deactivate', async (req, res) => {
  await pool.query('UPDATE users SET active=FALSE,updated_at=NOW() WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── MFA setup / verify ────────────────────────────────────────────
app.post('/mfa/setup', async (req, res) => {
  const { user_id } = req.body;
  const secret = speakeasy.generateSecret({ name: 'TransportOS', length: 20 });
  await pool.query('UPDATE users SET mfa_secret=$1 WHERE id=$2', [secret.base32, user_id]);
  res.json({ otpauth_url: secret.otpauth_url, base32: secret.base32 });
});

app.post('/mfa/verify', async (req, res) => {
  const { user_id, token } = req.body;
  const { rows } = await pool.query('SELECT mfa_secret FROM users WHERE id=$1', [user_id]);
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  const ok = speakeasy.totp.verify({
    secret: rows[0].mfa_secret, encoding: 'base32', token, window: 1,
  });
  if (!ok) return res.status(400).json({ error: 'Invalid code' });
  await pool.query('UPDATE users SET mfa_enabled=TRUE WHERE id=$1', [user_id]);
  res.json({ ok: true });
});

// ── Audit log ─────────────────────────────────────────────────────
app.get('/audit', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const { rows } = await pool.query(
    'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]
  );
  res.json({ data: rows, total: rows.length });
});

const PORT = Number(process.env.PORT ?? 4005);
app.listen(PORT, '0.0.0.0', () =>
  console.log(`[identity-service] Listening on port ${PORT}`)
);
