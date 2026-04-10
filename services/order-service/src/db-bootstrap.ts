import { Pool } from 'pg';

export async function bootstrapDatabase(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('[db] Auto-bootstrap starting...');
    await client.query('BEGIN');

    // Extensions
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(200) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        plan VARCHAR(50) NOT NULL DEFAULT 'enterprise',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(200) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'LOGISTICS_EXEC',
        password_hash VARCHAR(255),
        mfa_secret VARCHAR(100),
        mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, email)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        name VARCHAR(200) NOT NULL,
        type VARCHAR(100) NOT NULL,
        protocol VARCHAR(50) NOT NULL DEFAULT 'REST',
        config JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        last_sync TIMESTAMPTZ,
        error_msg TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id),
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(200) NOT NULL,
        channels TEXT[] NOT NULL DEFAULT '{}',
        subject_tpl TEXT,
        body_tpl TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('[db] Tables ready');

    // Check seed
    const { rows } = await client.query(
      `SELECT id FROM tenants WHERE slug='demo' LIMIT 1`
    );

    if (rows.length > 0) {
      console.log('[db] Already seeded');
      await client.query('COMMIT');
      return;
    }

    // Seed Data
    const T = '00000000-0000-0000-0000-000000000001';
    const A = '00000000-0000-0000-0000-000000000010';

    await client.query(
      `INSERT INTO tenants(id,name,slug,plan)
       VALUES($1,'TransportOS Demo','demo','enterprise')
       ON CONFLICT DO NOTHING`,
      [T]
    );

    await client.query(
      `INSERT INTO users(id,tenant_id,email,name,role,active)
       VALUES($1,$2,'admin@transportos.com','System Admin','SUPER_ADMIN',TRUE)
       ON CONFLICT DO NOTHING`,
      [A, T]
    );

    const templates = [
      ['SHIPMENT_DISPATCHED','Shipment Dispatched',['email','sms','push'],'Shipment {{shipment_id}} dispatched','Departed {{origin}}'],
      ['DELAY_ALERT','Delay Alert',['email','sms'],'Delay {{shipment_id}}','SLA risk'],
      ['INVOICE_GENERATED','Invoice Generated',['email'],'Invoice {{invoice_number}}','For {{amount}}']
    ];

    for (const [code, name, channels, subject, body] of templates) {
      await client.query(
        `INSERT INTO notification_templates
         (tenant_id,code,name,channels,subject_tpl,body_tpl,active)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE)
         ON CONFLICT DO NOTHING`,
        [T, code, name, channels, subject, body]
      );
    }

    await client.query('COMMIT');
    console.log('[db] ✓ Bootstrap complete');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[db] Bootstrap failed ❌', err);
    throw err;
  } finally {
    client.release();
  }
}