import { Pool } from 'pg';

export async function bootstrapDatabase(pool: Pool): Promise<void> {
  console.log('[db] Running auto-bootstrap...');

  await pool.query(`
    -- ✅ Use modern UUID generator
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
      PRIMARY KEY(user_id, permission)
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

    CREATE TABLE IF NOT EXISTS inventory_audit (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku VARCHAR(100) NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT,
      user_id UUID REFERENCES users(id), -- ✅ FIXED missing FK
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      vendor_id UUID NOT NULL REFERENCES vendors(id),
      po_number VARCHAR(50) NOT NULL UNIQUE,
      items JSONB NOT NULL DEFAULT '[]',
      total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      expected_date DATE,
      notes TEXT,
      approved_by UUID REFERENCES users(id), -- ✅ FIXED
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      order_number VARCHAR(50) NOT NULL UNIQUE,
      customer_name VARCHAR(200) NOT NULL,
      origin_city VARCHAR(100) NOT NULL,
      dest_city VARCHAR(100) NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      total_items INTEGER NOT NULL DEFAULT 0,
      total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
      weight_kg NUMERIC(10,3),
      volume_cbm NUMERIC(10,3),
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      priority VARCHAR(20) NOT NULL DEFAULT 'standard',
      sla_date DATE,
      notes TEXT,
      created_by UUID REFERENCES users(id), -- ✅ FIXED FK
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL,
      description TEXT,
      created_by UUID REFERENCES users(id), -- ✅ added
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      shipment_number VARCHAR(50) NOT NULL UNIQUE,
      order_id UUID REFERENCES orders(id),
      carrier_name VARCHAR(200),
      transport_mode VARCHAR(50) NOT NULL DEFAULT 'Road',
      vehicle_reg VARCHAR(50),
      device_id VARCHAR(100),
      origin_city VARCHAR(100) NOT NULL,
      dest_city VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      eta TIMESTAMPTZ,
      departed_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS carriers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50),
      modes TEXT[] NOT NULL DEFAULT '{}',
      on_time_pct NUMERIC(5,2) NOT NULL DEFAULT 85.00,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id),
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      customer_name VARCHAR(200) NOT NULL,
      order_id UUID REFERENCES orders(id),
      subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      due_date DATE,
      paid_at TIMESTAMPTZ,
      payment_ref VARCHAR(200),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID NOT NULL REFERENCES invoices(id),
      amount NUMERIC(15,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      method VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      gateway VARCHAR(50),
      gateway_txn_id VARCHAR(200),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('[db] Tables OK');

  // =========================
  // SEED DATA
  // =========================

  const { rows } = await pool.query(
    `SELECT id FROM tenants WHERE slug='demo' LIMIT 1`
  );

  if (rows.length > 0) {
    console.log('[db] Already seeded ✓');
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