import { Pool } from 'pg';

/**
 * AUTO DB BOOTSTRAP
 * Fully idempotent + production safe
 */
export async function bootstrapDatabase(pool: Pool): Promise<void> {
  console.log('[db] Running auto-bootstrap...');

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- =========================
    -- TENANTS
    -- =========================
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(200) NOT NULL UNIQUE,
      slug VARCHAR(100) NOT NULL UNIQUE,
      plan VARCHAR(50) NOT NULL DEFAULT 'enterprise',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- =========================
    -- USERS
    -- =========================
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

    -- =========================
    -- NOTIFICATION TEMPLATES
    -- =========================
    CREATE TABLE IF NOT EXISTS notification_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
      code VARCHAR(100) NOT NULL,
      name VARCHAR(200) NOT NULL,
      channels TEXT[] NOT NULL DEFAULT '{}',
      subject_tpl TEXT,
      body_tpl TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, code)  -- ✅ FIXED
    );

    -- =========================
    -- NOTIFICATION LOG
    -- =========================
    CREATE TABLE IF NOT EXISTS notification_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
      template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
      channel VARCHAR(50) NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      subject TEXT,
      body TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'SENT',
      error_msg TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('[db] Tables created (or already exist)');
  await seedData(pool);
  console.log('[db] Bootstrap complete ✓');
}

async function seedData(pool: Pool): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id FROM tenants WHERE slug='demo' LIMIT 1`
  );

  if (rows.length > 0) {
    console.log('[db] Seed data already present — skipping');
    return;
  }

  console.log('[db] Seeding demo data...');

  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const ADMIN_ID  = '00000000-0000-0000-0000-000000000010';

  // =========================
  // TENANT + ADMIN
  // =========================
  await pool.query(
    `INSERT INTO tenants (id,name,slug,plan)
     VALUES ($1,'TransportOS Demo','demo','enterprise')
     ON CONFLICT (slug) DO NOTHING`,
    [TENANT_ID]
  );

  await pool.query(
    `INSERT INTO users (id,tenant_id,email,name,role,active)
     VALUES ($1,$2,'admin@transportos.com','System Admin','SUPER_ADMIN',TRUE)
     ON CONFLICT (id) DO NOTHING`,
    [ADMIN_ID, TENANT_ID]
  );

  // =========================
  // NOTIFICATION TEMPLATES
  // =========================
  const templates = [
    ['SHIPMENT_DISPATCHED','Shipment Dispatched', ['email','sms','push'],           'Shipment {{shipment_id}} dispatched',           'Your shipment {{shipment_id}} departed {{origin}} at {{time}}. ETA: {{eta}}.'],
    ['DELIVERY_COMPLETED', 'Delivery Completed',  ['email','push'],                 'Shipment {{shipment_id}} delivered',            'Shipment {{shipment_id}} delivered to {{destination}} at {{delivered_at}}.'],
    ['DELAY_ALERT',        'Delay Alert',         ['email','sms','push','in-app'],  'Alert: Shipment {{shipment_id}} delayed',       'Shipment {{shipment_id}} is at SLA risk. ETA: {{eta}}. Reason: {{reason}}.'],
    ['GEOFENCE_ALERT',     'Geofence Alert',      ['email','sms','push','in-app'],  'Geofence: Vehicle {{vehicle_id}} {{event}}',    'Vehicle {{vehicle_id}} {{event}} geofence "{{fence_name}}" at {{time}}.'],
    ['INVOICE_GENERATED',  'Invoice Generated',   ['email'],                        'Invoice {{invoice_number}} — {{amount}}',       'Invoice {{invoice_number}} for {{amount}} ready. Due: {{due_date}}.'],
    ['EXCEPTION_DETECTED', 'Exception Detected',  ['email','sms','push','in-app'],  'URGENT: Exception on {{shipment_id}}',          'Anomaly on {{shipment_id}}: {{description}}. Immediate action required.'],
  ];

  for (const [code, name, channels, subject, body] of templates) {
    await pool.query(
      `INSERT INTO notification_templates
       (tenant_id,code,name,channels,subject_tpl,body_tpl,active)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)
       ON CONFLICT (tenant_id, code) DO NOTHING`,
      [TENANT_ID, code, name, channels, subject, body]
    );
  }

  console.log('[db] ✓ Demo data seeded');
}