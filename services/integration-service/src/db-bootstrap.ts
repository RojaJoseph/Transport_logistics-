import { Pool } from 'pg';

/**
 * AUTO DB BOOTSTRAP — copied from services/shared/db-bootstrap.ts
 * Called on startup. Creates all tables (IF NOT EXISTS) + seeds demo data.
 * Completely idempotent — safe to run multiple times.
 */
export async function bootstrapDatabase(pool: Pool): Promise<void> {
  console.log('[db] Running auto-bootstrap...');

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(200) NOT NULL UNIQUE, slug VARCHAR(100) NOT NULL UNIQUE,
      plan VARCHAR(50) NOT NULL DEFAULT 'enterprise', active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL, name VARCHAR(200) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'LOGISTICS_EXEC', password_hash VARCHAR(255),
      mfa_secret VARCHAR(100), mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE, last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, email)
    );
    CREATE TABLE IF NOT EXISTS integrations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      name VARCHAR(200) NOT NULL, type VARCHAR(100) NOT NULL,
      protocol VARCHAR(50) NOT NULL DEFAULT 'REST', config JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING', last_sync TIMESTAMPTZ,
      error_msg TEXT, active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS integration_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      integration_id UUID NOT NULL REFERENCES integrations(id),
      event_type VARCHAR(100) NOT NULL, direction VARCHAR(10) NOT NULL DEFAULT 'IN',
      payload JSONB, status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
      error_msg TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('[db] Tables created (or already exist)');
  await seedData(pool);
  console.log('[db] Bootstrap complete ✓');
}

async function seedData(pool: Pool): Promise<void> {
  const { rows } = await pool.query(`SELECT id FROM tenants WHERE slug='demo' LIMIT 1`);
  if (rows.length > 0) { console.log('[db] Seed data already present — skipping'); return; }

  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const ADMIN_ID  = '00000000-0000-0000-0000-000000000010';

  await pool.query(`INSERT INTO tenants (id,name,slug,plan) VALUES ($1,'TransportOS Demo','demo','enterprise') ON CONFLICT DO NOTHING`, [TENANT_ID]);
  await pool.query(`INSERT INTO users (id,tenant_id,email,name,role,active) VALUES ($1,$2,'admin@transportos.com','System Admin','SUPER_ADMIN',TRUE) ON CONFLICT DO NOTHING`, [ADMIN_ID, TENANT_ID]);

  const integrations = [
    ['SAP S/4HANA',        'ERP',        'RFC/BAPI'],
    ['BlueDart API',       'Carrier',    'REST'],
    ['DTDC EDI',           'EDI',        'X12/EDIFACT'],
    ['Stripe Billing',     'Finance',    'REST'],
    ['Delhivery',          'Carrier',    'REST'],
    ['FedEx Web Services', 'Carrier',    'SOAP'],
    ['Customs ICEGate',    'Government', 'REST'],
    ['Google Maps API',    'Maps',       'REST'],
  ];
  for (const [name, type, protocol] of integrations) {
    await pool.query(
      `INSERT INTO integrations (tenant_id,name,type,protocol,status,active) VALUES ($1,$2,$3,$4,'CONNECTED',TRUE) ON CONFLICT DO NOTHING`,
      [TENANT_ID, name, type, protocol]
    );
  }
  console.log('[db] ✓ Demo data seeded');
}
