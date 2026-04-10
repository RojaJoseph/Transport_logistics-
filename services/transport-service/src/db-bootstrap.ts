import { Pool } from 'pg';

export async function bootstrapDatabase(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('[db] Auto-bootstrap starting...');

    // ✅ SAFE RESET (ONLY when explicitly enabled)
    if (
      process.env.RESET_DB === 'true' &&
      process.env.ALLOW_DB_RESET === 'true'
    ) {
      console.log('[db] RESET_DB enabled — wiping schema...');
      await client.query(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
      `);
    }

    await client.query('BEGIN');

    // =========================
    // EXTENSIONS
    // =========================
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // =========================
    // TENANTS
    // =========================
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

    // =========================
    // USERS
    // =========================
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

    // =========================
    // WAREHOUSES
    // =========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        name VARCHAR(200) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        pincode VARCHAR(20),
        address TEXT,
        capacity_sqm NUMERIC(10,2),
        type VARCHAR(50) NOT NULL DEFAULT 'general',
        lat NUMERIC(10,6),
        lng NUMERIC(10,6),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // =========================
    // VENDORS
    // =========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        name VARCHAR(200) NOT NULL,
        gstin VARCHAR(15),
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        payment_terms INTEGER NOT NULL DEFAULT 30,
        rating NUMERIC(3,2) NOT NULL DEFAULT 3.00,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // =========================
    // INVENTORY
    // =========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        sku VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        qty INTEGER NOT NULL DEFAULT 0,
        unit VARCHAR(50) NOT NULL DEFAULT 'Units',
        warehouse_id UUID REFERENCES warehouses(id),
        unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 50,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, sku)
      );
    `);

    // =========================
    // ORDERS
    // =========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        order_number VARCHAR(50) NOT NULL UNIQUE,
        customer_name VARCHAR(200) NOT NULL,
        origin_city VARCHAR(100) NOT NULL,
        dest_city VARCHAR(100) NOT NULL,
        total_items INTEGER NOT NULL DEFAULT 0,
        total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        priority VARCHAR(20) NOT NULL DEFAULT 'standard',
        sla_date DATE,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // =========================
    // SHIPMENTS
    // =========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shipment_number VARCHAR(50) NOT NULL UNIQUE,
        carrier_name VARCHAR(200),
        transport_mode VARCHAR(50) NOT NULL DEFAULT 'Road',
        vehicle_reg VARCHAR(50),
        device_id VARCHAR(100),
        origin_city VARCHAR(100) NOT NULL,
        dest_city VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // =========================
    // NOTIFICATIONS
    // =========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id),
        code VARCHAR(100) NOT NULL,
        name VARCHAR(200) NOT NULL,
        channels TEXT[] NOT NULL DEFAULT '{}',
        subject_tpl TEXT,
        body_tpl TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, code)
      );
    `);

    // =========================
    // INTEGRATIONS
    // =========================
    await client.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        name VARCHAR(200) NOT NULL,
        type VARCHAR(100) NOT NULL,
        protocol VARCHAR(50) NOT NULL DEFAULT 'REST',
        config JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, name)
      );
    `);

    console.log('[db] Tables ready');

    // =========================
    // SEED CHECK
    // =========================
    const { rows } = await client.query(
      `SELECT id FROM tenants WHERE slug='demo' LIMIT 1`
    );

    if (rows.length > 0) {
      console.log('[db] Already seeded');
      await client.query('COMMIT');
      return;
    }

    console.log('[db] Seeding demo data...');

    const TENANT_ID = '00000000-0000-0000-0000-000000000001';
    const ADMIN_ID  = '00000000-0000-0000-0000-000000000010';

    await client.query(
      `INSERT INTO tenants(id,name,slug,plan)
       VALUES($1,'TransportOS Demo','demo','enterprise')
       ON CONFLICT (slug) DO NOTHING`,
      [TENANT_ID]
    );

    await client.query(
      `INSERT INTO users(id,tenant_id,email,name,role,active)
       VALUES($1,$2,'admin@transportos.com','System Admin','SUPER_ADMIN',TRUE)
       ON CONFLICT (id) DO NOTHING`,
      [ADMIN_ID, TENANT_ID]
    );

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