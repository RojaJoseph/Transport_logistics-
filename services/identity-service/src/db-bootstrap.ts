import { Pool } from 'pg';

export async function bootstrapDatabase(pool: Pool): Promise<void> {
  console.log('[db] Running auto-bootstrap...');

  // ✅ SAFE RESET (only when explicitly allowed)
  if (
    process.env.RESET_DB === 'true' &&
    process.env.ALLOW_DB_RESET === 'true'
  ) {
    console.log('[db] RESET_DB enabled — wiping schema...');
    await pool.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `);
  }

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- =========================
    -- CORE TABLES
    -- =========================

    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL UNIQUE,
      slug VARCHAR(100) NOT NULL UNIQUE,
      plan VARCHAR(50) DEFAULT 'enterprise',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(200) NOT NULL,
      role VARCHAR(50) DEFAULT 'LOGISTICS_EXEC',
      password_hash VARCHAR(255),
      mfa_secret VARCHAR(100),
      mfa_enabled BOOLEAN DEFAULT FALSE,
      active BOOLEAN DEFAULT TRUE,
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, email)
    );

    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      permission VARCHAR(100),
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
      risk_level VARCHAR(20) DEFAULT 'low',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- =========================
    -- OPERATIONS
    -- =========================

    CREATE TABLE IF NOT EXISTS warehouses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(200),
      city VARCHAR(100),
      state VARCHAR(100),
      pincode VARCHAR(20),
      address TEXT,
      capacity_sqm NUMERIC(10,2),
      type VARCHAR(50) DEFAULT 'general',
      lat NUMERIC(10,6),
      lng NUMERIC(10,6),
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      name VARCHAR(200),
      gstin VARCHAR(15),
      email VARCHAR(255),
      phone VARCHAR(20),
      address TEXT,
      payment_terms INTEGER DEFAULT 30,
      rating NUMERIC(3,2) DEFAULT 3.0,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      sku VARCHAR(100),
      name VARCHAR(255),
      qty INTEGER DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'Units',
      warehouse_id UUID REFERENCES warehouses(id),
      unit_cost NUMERIC(12,2) DEFAULT 0,
      reorder_level INTEGER DEFAULT 50,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, sku)
    );

    CREATE TABLE IF NOT EXISTS inventory_audit (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku VARCHAR(100),
      delta INTEGER,
      reason TEXT,
      user_id UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      vendor_id UUID REFERENCES vendors(id),
      po_number VARCHAR(50) UNIQUE,
      items JSONB DEFAULT '[]',
      total_value NUMERIC(15,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'DRAFT',
      expected_date DATE,
      notes TEXT,
      approved_by UUID REFERENCES users(id),
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      order_number VARCHAR(50) UNIQUE,
      customer_name VARCHAR(200),
      origin_city VARCHAR(100),
      dest_city VARCHAR(100),
      items JSONB DEFAULT '[]',
      total_items INTEGER DEFAULT 0,
      total_value NUMERIC(15,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'PENDING',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      event_type VARCHAR(100),
      description TEXT,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      shipment_number VARCHAR(50) UNIQUE,
      order_id UUID REFERENCES orders(id),
      carrier_name VARCHAR(200),
      transport_mode VARCHAR(50) DEFAULT 'Road',
      vehicle_reg VARCHAR(50),
      origin_city VARCHAR(100),
      dest_city VARCHAR(100),
      status VARCHAR(50) DEFAULT 'PENDING',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id),
      invoice_number VARCHAR(50) UNIQUE,
      customer_name VARCHAR(200),
      order_id UUID REFERENCES orders(id),
      total_amount NUMERIC(15,2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'DRAFT',
      due_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID REFERENCES invoices(id),
      amount NUMERIC(15,2),
      method VARCHAR(50),
      status VARCHAR(50) DEFAULT 'PENDING',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  console.log('[db] Tables ready');

  await seedData(pool);

  console.log('[db] Bootstrap complete ✓');
}

// =========================
// SEED FUNCTION
// =========================

async function seedData(pool: Pool): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id FROM tenants WHERE slug='demo' LIMIT 1`
  );

  if (rows.length > 0) {
    console.log('[db] Already seeded ✓');
    return;
  }

  console.log('[db] Seeding initial data...');

  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const ADMIN_ID  = '00000000-0000-0000-0000-000000000010';

  await pool.query(
    `INSERT INTO tenants (id, name, slug)
     VALUES ($1, 'TransportOS Demo', 'demo')`,
    [TENANT_ID]
  );

  await pool.query(
    `INSERT INTO users (id, tenant_id, email, name, role)
     VALUES ($1, $2, 'admin@transportos.com', 'System Admin', 'SUPER_ADMIN')`,
    [ADMIN_ID, TENANT_ID]
  );

  console.log('[db] ✓ Seed complete');
}