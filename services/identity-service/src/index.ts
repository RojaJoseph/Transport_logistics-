import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { z } from 'zod';
import { bootstrapDatabase } from './db-bootstrap';

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false,
});

app.use(helmet());
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET ?? 'transportos_secret_change_in_production!!';
const JWT_EXPIRES = (process.env.JWT_EXPIRES ?? '8h') as any;

// ── HEALTH ─────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'identity' })
);

// ── LOGIN ─────────────────────────────────────────────
app.post('/login', async (req, res) => {
  const { email, password, mfa_code } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'email required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.*, 
              array_agg(up.permission) FILTER (WHERE up.permission IS NOT NULL) AS permissions,
              t.slug AS tenant
       FROM users u
       LEFT JOIN user_permissions up ON up.user_id = u.id
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND u.active = TRUE
       GROUP BY u.id, t.slug`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    // ── PASSWORD CHECK ─────────────────────────
    if (user.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Password required' });
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      // ✅ DEMO MODE
      console.log('[identity] Demo login (no password set)');
    }

    // ── MFA CHECK ─────────────────────────────
    if (user.mfa_enabled && user.mfa_secret) {
      if (!mfa_code) {
        return res.status(202).json({ mfa_required: true });
      }

      const ok = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfa_code,
        window: 1,
      });

      if (!ok) {
        return res.status(401).json({ error: 'Invalid MFA code' });
      }
    }

    // ── UPDATE LAST LOGIN ─────────────────────
    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [
      user.id,
    ]);

    // ── AUDIT LOG ─────────────────────────────
    pool
      .query(
        `INSERT INTO audit_logs 
         (tenant_id,user_id,user_name,action,detail,risk_level)
         VALUES ($1,$2,$3,'USER_LOGIN','Successful login','low')`,
        [user.tenant_id, user.id, user.name]
      )
      .catch(() => {});

    // ── TOKEN ────────────────────────────────
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenant ?? 'ENTERPRISE',
        tenant_id: user.tenant_id,
        permissions: user.permissions ?? [],
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenant ?? 'ENTERPRISE',
        permissions: user.permissions ?? [],
      },
    });
  } catch (err: any) {
    console.error('[identity] login error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── REFRESH TOKEN ───────────────────────────
app.post('/refresh', (req, res) => {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload: any = jwt.verify(auth.slice(7), JWT_SECRET);

    delete payload.iat;
    delete payload.exp;

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES,
    });

    res.json({ token });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ── USERS ──────────────────────────────────
app.get('/users', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id,email,name,role,mfa_enabled,active,last_login 
     FROM users ORDER BY name`
  );

  res.json({ data: rows, total: rows.length });
});

app.post('/users', async (req, res) => {
  const { email, name, role, tenant_id, password } = req.body;

  const hash = password ? await bcrypt.hash(password, 12) : null;

  const { rows } = await pool.query(
    `INSERT INTO users (tenant_id,email,name,role,password_hash)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id,email,name,role`,
    [tenant_id, email, name, role ?? 'LOGISTICS_EXEC', hash]
  );

  res.status(201).json(rows[0]);
});

app.patch('/users/:id/role', async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE users SET role=$1,updated_at=NOW() 
     WHERE id=$2 RETURNING id,email,name,role`,
    [req.body.role, req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(rows[0]);
});

// ── MFA ────────────────────────────────────
app.post('/mfa/setup', async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: 'TransportOS',
    length: 20,
  });

  await pool.query(
    'UPDATE users SET mfa_secret=$1 WHERE id=$2',
    [secret.base32, req.body.user_id]
  );

  res.json({
    otpauth_url: secret.otpauth_url,
    base32: secret.base32,
  });
});

app.post('/mfa/verify', async (req, res) => {
  const { user_id, token } = req.body;

  const { rows } = await pool.query(
    'SELECT mfa_secret FROM users WHERE id=$1',
    [user_id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  const ok = speakeasy.totp.verify({
    secret: rows[0].mfa_secret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!ok) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  await pool.query(
    'UPDATE users SET mfa_enabled=TRUE WHERE id=$1',
    [user_id]
  );

  res.json({ ok: true });
});

// ── AUDIT ──────────────────────────────────
app.get('/audit', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;

  const { rows } = await pool.query(
    'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1',
    [limit]
  );

  res.json({ data: rows, total: rows.length });
});

// ── START ──────────────────────────────────
const PORT = Number(process.env.PORT ?? process.env.PORT_IDENTITY ?? 4005);

async function start() {
  await bootstrapDatabase(pool);
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`[identity-service] http://0.0.0.0:${PORT}`)
  );
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});