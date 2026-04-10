import { Pool } from 'pg';

export async function bootstrapDatabase(pool: Pool): Promise<void> {
  console.log('[db] Running auto-bootstrap...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      -- Extensions
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pg_trgm";

      -- Updated_at trigger function
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- ─────────────────────────────────────────────────────────────
      -- TENANTS
      -- ─────────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(200) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        plan VARCHAR(50) NOT NULL DEFAULT 'enterprise',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

      -- ─────────────────────────────────────────────────────────────
      -- USERS
      -- ─────────────────────────────────────────────────────────────
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
        UNIQUE(tenant_id, email)
      );

      CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

      -- Trigger
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_users_updated_at'
        ) THEN
          CREATE TRIGGER set_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;

      -- ─────────────────────────────────────────────────────────────
      -- WAREHOUSES
      -- ─────────────────────────────────────────────────────────────
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

      CREATE INDEX IF NOT EXISTS idx_warehouses_city ON warehouses(city);

      -- ─────────────────────────────────────────────────────────────
      -- INVENTORY
      -- ─────────────────────────────────────────────────────────────
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
        UNIQUE(tenant_id, sku)
      );

      CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);

      -- ─────────────────────────────────────────────────────────────
      -- ORDERS
      -- ─────────────────────────────────────────────────────────────
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
        sla_date DATE,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

      -- ─────────────────────────────────────────────────────────────
      -- SHIPMENTS
      -- ─────────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS shipments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        shipment_number VARCHAR(50) NOT NULL UNIQUE,
        carrier_name VARCHAR(200),
        transport_mode VARCHAR(50) NOT NULL DEFAULT 'Road',
        origin_city VARCHAR(100) NOT NULL,
        dest_city VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

      -- ─────────────────────────────────────────────────────────────
      -- INVOICES
      -- ─────────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        customer_name VARCHAR(200) NOT NULL,
        total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
        due_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log('[db] Tables ready');

    await seedData(client);

    await client.query('COMMIT');
    console.log('[db] Bootstrap complete ✓');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[db] Bootstrap failed ❌', err);
    throw err;
  } finally {
    client.release();
  }
}

/* ───────────────────────────────────────────────────────────── */
/* SEED DATA */
/* ───────────────────────────────────────────────────────────── */

async function seedData(client: any) {
  const { rows } = await client.query(
    `SELECT id FROM tenants WHERE slug='demo' LIMIT 1`
  );

  if (rows.length > 0) {
    console.log('[db] Seed already exists');
    return;
  }

  console.log('[db] Seeding demo data...');

  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const ADMIN_ID = '00000000-0000-0000-0000-000000000010';

  await client.query(
    `INSERT INTO tenants(id,name,slug) VALUES($1,'TransportOS Demo','demo')`,
    [TENANT_ID]
  );

  await client.query(
    `INSERT INTO users(id,tenant_id,email,name,role)
     VALUES($1,$2,'admin@transportos.com','System Admin','SUPER_ADMIN')`,
    [ADMIN_ID, TENANT_ID]
  );

  await client.query(
    `INSERT INTO warehouses(tenant_id,name,city)
     VALUES($1,'Chennai Hub','Chennai')`,
    [TENANT_ID]
  );

  await client.query(
    `INSERT INTO orders(tenant_id,order_number,customer_name,origin_city,dest_city,total_items,total_value,status,created_by)
     VALUES($1,'ORD-1001','Demo Customer','Chennai','Bangalore',10,50000,'CONFIRMED',$2)`,
    [TENANT_ID, ADMIN_ID]
  );

  await client.query(
    `INSERT INTO shipments(tenant_id,shipment_number,carrier_name,origin_city,dest_city,status)
     VALUES($1,'SHP-1001','BlueDart','Chennai','Bangalore','IN_TRANSIT')`,
    [TENANT_ID]
  );

  console.log('[db] Demo data seeded ✓');
}