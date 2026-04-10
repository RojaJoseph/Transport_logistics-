import { Pool } from 'pg';

export async function bootstrapDatabase(pool: Pool): Promise<void> {
  console.log('[db] Running auto-bootstrap...');

  await pool.query(`
    -- ✅ Use modern UUID extension
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- =========================
    -- CORE TABLES
    -- =========================

    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL UNIQUE,
      slug VARCHAR(100) NOT NULL UNIQUE,
      plan VARCHAR(50) NOT NULL DEFAULT 'enterprise',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission VARCHAR(100) NOT NULL,
      PRIMARY KEY (user_id, permission)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      user_id UUID REFERENCES users(id),
      user_name VARCHAR(200),
      action VARCHAR(100) NOT NULL,
      detail TEXT,
      ip_address INET,
      risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- =========================
    -- OPERATIONS
    -- =========================

    CREATE TABLE IF NOT EXISTS warehouses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

    CREATE TABLE IF NOT EXISTS vendors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

    CREATE TABLE IF NOT EXISTS inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

    CREATE TABLE IF NOT EXISTS shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      shipment_number VARCHAR(50) NOT NULL UNIQUE,
      order_id UUID REFERENCES orders(id),
      carrier_name VARCHAR(200),
      transport_mode VARCHAR(50) NOT NULL DEFAULT 'Road',
      origin_city VARCHAR(100) NOT NULL,
      dest_city VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      customer_name VARCHAR(200) NOT NULL,
      subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      due_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('[db] Tables OK');

  await seedData(pool);

  console.log('[db] Bootstrap complete ✓');
}

async function seedData(pool: Pool): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id FROM tenants WHERE slug='demo' LIMIT 1`
  );

  if (rows.length > 0) {
    console.log('[db] Already seeded');
    return;
  }

  console.log('[db] Seeding...');

  const T = '00000000-0000-0000-0000-000000000001';
  const A = '00000000-0000-0000-0000-000000000010';

  await pool.query(
    `INSERT INTO tenants(id,name,slug) VALUES($1,'TransportOS Demo','demo')`,
    [T]
  );

  await pool.query(
    `INSERT INTO users(id,tenant_id,email,name,role)
     VALUES($1,$2,'admin@transportos.com','System Admin','SUPER_ADMIN')`,
    [A, T]
  );

  console.log('[db] ✓ Seeded');
}