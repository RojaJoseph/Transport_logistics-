import { Pool } from 'pg';

/**
 * AUTO DB BOOTSTRAP
 * ─────────────────────────────────────────────────────────────────
 * Called by every service on startup.
 * Creates all tables (IF NOT EXISTS) + seeds demo data.
 * Safe to run multiple times — completely idempotent.
 */
export async function bootstrapDatabase(pool: Pool): Promise<void> {
  console.log('[db] Running auto-bootstrap...');

  await pool.query(`
    -- Extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- ── Tenants ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS tenants (
      id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name       VARCHAR(200) NOT NULL UNIQUE,
      slug       VARCHAR(100) NOT NULL UNIQUE,
      plan       VARCHAR(50)  NOT NULL DEFAULT 'enterprise',
      active     BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ── Users ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email         VARCHAR(255) NOT NULL,
      name          VARCHAR(200) NOT NULL,
      role          VARCHAR(50)  NOT NULL DEFAULT 'LOGISTICS_EXEC',
      password_hash VARCHAR(255),
      mfa_secret    VARCHAR(100),
      mfa_enabled   BOOLEAN      NOT NULL DEFAULT FALSE,
      active        BOOLEAN      NOT NULL DEFAULT TRUE,
      last_login    TIMESTAMPTZ,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, email)
    );

    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission VARCHAR(100) NOT NULL,
      PRIMARY KEY (user_id, permission)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id  UUID        REFERENCES tenants(id),
      user_id    UUID        REFERENCES users(id),
      user_name  VARCHAR(200),
      action     VARCHAR(100) NOT NULL,
      detail     TEXT,
      ip_address INET,
      risk_level VARCHAR(20)  NOT NULL DEFAULT 'low',
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ── Warehouses ─────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS warehouses (
      id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id    UUID         NOT NULL REFERENCES tenants(id),
      name         VARCHAR(200) NOT NULL,
      city         VARCHAR(100) NOT NULL,
      state        VARCHAR(100),
      pincode      VARCHAR(20),
      address      TEXT,
      capacity_sqm NUMERIC(10,2),
      type         VARCHAR(50)  NOT NULL DEFAULT 'general',
      lat          NUMERIC(10,6),
      lng          NUMERIC(10,6),
      active       BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ── Vendors ────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS vendors (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id     UUID         NOT NULL REFERENCES tenants(id),
      name          VARCHAR(200) NOT NULL,
      gstin         VARCHAR(15),
      email         VARCHAR(255),
      phone         VARCHAR(20),
      address       TEXT,
      payment_terms INTEGER      NOT NULL DEFAULT 30,
      rating        NUMERIC(3,2) NOT NULL DEFAULT 3.00,
      active        BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ── Inventory ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS inventory (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id     UUID          NOT NULL REFERENCES tenants(id),
      sku           VARCHAR(100)  NOT NULL,
      name          VARCHAR(255)  NOT NULL,
      qty           INTEGER       NOT NULL DEFAULT 0,
      unit          VARCHAR(50)   NOT NULL DEFAULT 'Units',
      warehouse_id  UUID          REFERENCES warehouses(id),
      unit_cost     NUMERIC(12,2) NOT NULL DEFAULT 0,
      reorder_level INTEGER       NOT NULL DEFAULT 50,
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, sku)
    );

    CREATE TABLE IF NOT EXISTS inventory_audit (
      id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      sku        VARCHAR(100) NOT NULL,
      delta      INTEGER      NOT NULL,
      reason     TEXT,
      user_id    UUID,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ── Purchase Orders ────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id     UUID          NOT NULL REFERENCES tenants(id),
      vendor_id     UUID          NOT NULL REFERENCES vendors(id),
      po_number     VARCHAR(50)   NOT NULL UNIQUE,
      items         JSONB         NOT NULL DEFAULT '[]',
      total_value   NUMERIC(15,2) NOT NULL DEFAULT 0,
      status        VARCHAR(50)   NOT NULL DEFAULT 'DRAFT',
      expected_date DATE,
      notes         TEXT,
      approved_by   UUID          REFERENCES users(id),
      approved_at   TIMESTAMPTZ,
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    -- ── Orders ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS orders (
      id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id      UUID          NOT NULL REFERENCES tenants(id),
      order_number   VARCHAR(50)   NOT NULL UNIQUE,
      customer_name  VARCHAR(200)  NOT NULL,
      customer_id    UUID,
      origin_city    VARCHAR(100)  NOT NULL,
      dest_city      VARCHAR(100)  NOT NULL,
      origin_address TEXT,
      dest_address   TEXT,
      items          JSONB         NOT NULL DEFAULT '[]',
      total_items    INTEGER       NOT NULL DEFAULT 0,
      total_value    NUMERIC(15,2) NOT NULL DEFAULT 0,
      weight_kg      NUMERIC(10,3),
      volume_cbm     NUMERIC(10,3),
      status         VARCHAR(50)   NOT NULL DEFAULT 'PENDING',
      priority       VARCHAR(20)   NOT NULL DEFAULT 'standard',
      sla_date       DATE,
      notes          TEXT,
      created_by     UUID          REFERENCES users(id),
      created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id    UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      event_type  VARCHAR(100) NOT NULL,
      description TEXT,
      meta        JSONB,
      created_by  UUID         REFERENCES users(id),
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ── Shipments ──────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS shipments (
      id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id       UUID         NOT NULL REFERENCES tenants(id),
      shipment_number VARCHAR(50)  NOT NULL UNIQUE,
      order_id        UUID         REFERENCES orders(id),
      carrier_name    VARCHAR(200),
      carrier_awb     VARCHAR(100),
      transport_mode  VARCHAR(50)  NOT NULL DEFAULT 'Road',
      vehicle_reg     VARCHAR(50),
      device_id       VARCHAR(100),
      origin_city     VARCHAR(100) NOT NULL,
      dest_city       VARCHAR(100) NOT NULL,
      status          VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
      eta             TIMESTAMPTZ,
      departed_at     TIMESTAMPTZ,
      delivered_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ── Carriers ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS carriers (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id     UUID         NOT NULL REFERENCES tenants(id),
      name          VARCHAR(200) NOT NULL,
      code          VARCHAR(50),
      modes         TEXT[]       NOT NULL DEFAULT '{}',
      on_time_pct   NUMERIC(5,2) NOT NULL DEFAULT 85.00,
      active        BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ── Invoices ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS invoices (
      id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id      UUID          NOT NULL REFERENCES tenants(id),
      invoice_number VARCHAR(50)   NOT NULL UNIQUE,
      customer_name  VARCHAR(200)  NOT NULL,
      customer_id    UUID,
      order_id       UUID          REFERENCES orders(id),
      line_items     JSONB         NOT NULL DEFAULT '[]',
      subtotal       NUMERIC(15,2) NOT NULL DEFAULT 0,
      tax_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
      total_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
      currency       VARCHAR(10)   NOT NULL DEFAULT 'INR',
      status         VARCHAR(50)   NOT NULL DEFAULT 'DRAFT',
      due_date       DATE,
      paid_at        TIMESTAMPTZ,
      payment_ref    VARCHAR(200),
      notes          TEXT,
      created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      invoice_id     UUID          NOT NULL REFERENCES invoices(id),
      amount         NUMERIC(15,2) NOT NULL,
      currency       VARCHAR(10)   NOT NULL DEFAULT 'INR',
      method         VARCHAR(50)   NOT NULL,
      status         VARCHAR(50)   NOT NULL DEFAULT 'PENDING',
      gateway        VARCHAR(50),
      gateway_txn_id VARCHAR(200),
      created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    -- ── Notification Templates ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS notification_templates (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id   UUID         REFERENCES tenants(id),
      code        VARCHAR(100) NOT NULL UNIQUE,
      name        VARCHAR(200) NOT NULL,
      channels    TEXT[]       NOT NULL DEFAULT '{}',
      subject_tpl TEXT,
      body_tpl    TEXT         NOT NULL,
      active      BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notification_log (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id   UUID         REFERENCES tenants(id),
      template_id UUID         REFERENCES notification_templates(id),
      channel     VARCHAR(50)  NOT NULL,
      recipient   VARCHAR(255) NOT NULL,
      subject     TEXT,
      body        TEXT,
      status      VARCHAR(50)  NOT NULL DEFAULT 'SENT',
      error_msg   TEXT,
      sent_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- ── Integrations ───────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS integrations (
      id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id  UUID         NOT NULL REFERENCES tenants(id),
      name       VARCHAR(200) NOT NULL,
      type       VARCHAR(100) NOT NULL,
      protocol   VARCHAR(50)  NOT NULL DEFAULT 'REST',
      config     JSONB        NOT NULL DEFAULT '{}',
      status     VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
      last_sync  TIMESTAMPTZ,
      error_msg  TEXT,
      active     BOOLEAN      NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS integration_events (
      id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      integration_id UUID         NOT NULL REFERENCES integrations(id),
      event_type     VARCHAR(100) NOT NULL,
      direction      VARCHAR(10)  NOT NULL DEFAULT 'IN',
      payload        JSONB,
      status         VARCHAR(50)  NOT NULL DEFAULT 'SUCCESS',
      error_msg      TEXT,
      created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);

  console.log('[db] Tables created (or already exist)');
  await seedData(pool);
  console.log('[db] Bootstrap complete ✓');
}

async function seedData(pool: Pool): Promise<void> {
  // Check if already seeded
  const { rows } = await pool.query(`SELECT id FROM tenants WHERE slug='demo' LIMIT 1`);
  if (rows.length > 0) {
    console.log('[db] Seed data already present — skipping');
    return;
  }

  console.log('[db] Seeding demo data...');

  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const ADMIN_ID  = '00000000-0000-0000-0000-000000000010';

  // Tenant
  await pool.query(`
    INSERT INTO tenants (id, name, slug, plan) VALUES
    ($1, 'TransportOS Demo', 'demo', 'enterprise')
    ON CONFLICT DO NOTHING
  `, [TENANT_ID]);

  // Admin user
  await pool.query(`
    INSERT INTO users (id, tenant_id, email, name, role, active) VALUES
    ($1, $2, 'admin@transportos.com', 'System Admin', 'SUPER_ADMIN', TRUE)
    ON CONFLICT DO NOTHING
  `, [ADMIN_ID, TENANT_ID]);

  // More users
  const users = [
    ['arjun.sharma@transportos.com', 'Arjun Sharma',  'OPS_MANAGER'  ],
    ['priya.nair@transportos.com',   'Priya Nair',    'LOGISTICS_EXEC'],
    ['deepa.menon@transportos.com',  'Deepa Menon',   'FINANCE_ADMIN' ],
    ['ravi.kumar@transportos.com',   'Ravi Kumar',    'ANALYST'       ],
  ];
  for (const [email, name, role] of users) {
    await pool.query(
      `INSERT INTO users (tenant_id,email,name,role,active) VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT DO NOTHING`,
      [TENANT_ID, email, name, role]
    );
  }

  // Warehouses
  const warehouses = [
    ['Mumbai Central Hub',    'Mumbai',    'Maharashtra', 19.0760,  72.8777, 45000, 'general'],
    ['Delhi NCR Distribution','Gurugram',  'Haryana',     28.4595,  77.0266, 62000, 'general'],
    ['Chennai Port Depot',    'Chennai',   'Tamil Nadu',  13.0827,  80.2707, 38000, 'port'   ],
    ['Bangalore Tech DC',     'Bangalore', 'Karnataka',   12.9716,  77.5946, 28000, 'general'],
    ['Delhi Cold Chain',      'Delhi',     'Delhi',       28.7041,  77.1025, 12000, 'cold'   ],
  ];
  for (const [name, city, state, lat, lng, cap, type] of warehouses) {
    await pool.query(
      `INSERT INTO warehouses (tenant_id,name,city,state,lat,lng,capacity_sqm,type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [TENANT_ID, name, city, state, lat, lng, cap, type]
    );
  }

  // Vendors
  const vendors = [
    ['Tata Motors Ltd',      '27AABCT1234F1ZV', 'logistics@tata.com',       '+91-22-6665-8282', 'Mumbai',    30, 4.5],
    ['Reliance Industries',  '27AAACR1234G1ZX', 'supply@ril.com',            '+91-22-3555-5000', 'Mumbai',    45, 4.2],
    ['Infosys Logistics',    '29AABCI1234H1ZY', 'vendors@infosys.com',       '+91-80-2852-0261', 'Bangalore', 30, 4.7],
    ['Mahindra & Mahindra',  '27AABCM1234I1ZW', 'procurement@mahindra.com',  '+91-22-2490-1441', 'Pune',      60, 4.3],
    ['Asian Paints Ltd',     '27AABCA1234J1ZV', 'supply@asianpaints.com',    '+91-22-6218-1000', 'Mumbai',    30, 3.9],
    ['HCL Technologies',     '29AABCH1234K1ZU', 'logistics@hcl.com',         '+91-120-432-6000', 'Noida',     30, 4.1],
    ['L&T Logistics',        '27AABCL1234L1ZT', 'supply@lt.com',             '+91-22-6752-5656', 'Mumbai',    45, 4.4],
    ['Wipro Ltd',            '29AABCW1234M1ZS', 'vendors@wipro.com',         '+91-80-2844-0011', 'Bangalore', 30, 4.0],
  ];
  for (const [name, gstin, email, phone, address, terms, rating] of vendors) {
    await pool.query(
      `INSERT INTO vendors (tenant_id,name,gstin,email,phone,address,payment_terms,rating) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [TENANT_ID, name, gstin, email, phone, address, terms, rating]
    );
  }

  // Carriers
  const carriers = [
    ['BlueDart',    'BDE', ['Air','Road'],  96.2],
    ['Delhivery',   'DEL', ['Road'],        88.4],
    ['DTDC',        'DTC', ['Road','Rail'], 82.1],
    ['FedEx India', 'FDX', ['Air','Road'],  94.8],
    ['Gati',        'GAT', ['Road'],        79.3],
    ['CONCOR Rail', 'CON', ['Rail'],        91.0],
  ];
  for (const [name, code, modes, otp] of carriers) {
    await pool.query(
      `INSERT INTO carriers (tenant_id,name,code,modes,on_time_pct) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [TENANT_ID, name, code, modes, otp]
    );
  }

  // Get first warehouse ID for inventory
  const { rows: whs } = await pool.query(`SELECT id FROM warehouses WHERE tenant_id=$1 AND city='Mumbai' LIMIT 1`, [TENANT_ID]);
  const whId = whs[0]?.id ?? null;

  // Inventory
  const items = [
    ['SKU-00123', 'Palletized Cargo Type A', 4200, 'Units',   200.00, 100],
    ['SKU-00124', 'Cold Chain Package B',     850,  'Cases',   250.00,  50],
    ['SKU-00125', 'Hazmat Drums C',             0,  'Drums',   800.00,  20],
    ['SKU-00126', 'Electronics Batch D',     1100,  'Boxes', 4000.00, 200],
    ['SKU-00127', 'Textile Roll E',           320,  'Rolls',   200.00,  80],
    ['SKU-00128', 'Auto Parts Kit F',          60,  'Sets',    500.00,  30],
    ['SKU-00129', 'Pharma Pack G',            500,  'Cartons', 350.00, 100],
    ['SKU-00130', 'FMCG Bundle H',           2400,  'Units',    45.00, 500],
  ];
  for (const [sku, name, qty, unit, cost, reorder] of items) {
    await pool.query(
      `INSERT INTO inventory (tenant_id,sku,name,qty,unit,warehouse_id,unit_cost,reorder_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [TENANT_ID, sku, name, qty, unit, whId, cost, reorder]
    );
  }

  // Orders
  const orders = [
    ['ORD-19283', 'Tata Motors',     'Mumbai',    'Delhi',     42,  824000, 'CONFIRMED',  '2025-04-09'],
    ['ORD-19284', 'Reliance Retail', 'Bangalore', 'Chennai',    8,  144500, 'IN_TRANSIT', '2025-04-08'],
    ['ORD-19285', 'Infosys',         'Pune',      'Hyderabad', 15,  320000, 'PENDING',    '2025-04-10'],
    ['ORD-19286', 'HCL Technologies','Kolkata',   'Ahmedabad',200, 2250000, 'DELIVERED',  '2025-04-06'],
    ['ORD-19287', 'Wipro Ltd',       'Chennai',   'Surat',      5,   68500, 'CANCELLED',  '2025-04-07'],
    ['ORD-19288', 'L&T Logistics',   'Delhi',     'Bangalore', 88, 1560000, 'CONFIRMED',  '2025-04-11'],
    ['ORD-19289', 'Asian Paints',    'Mumbai',    'Jaipur',    34,  410000, 'IN_TRANSIT', '2025-04-09'],
    ['ORD-19290', 'Mahindra',        'Pune',      'Kolkata',   72, 1820000, 'CONFIRMED',  '2025-04-12'],
  ];
  for (const [num, cust, orig, dest, items_cnt, val, status, sla] of orders) {
    await pool.query(
      `INSERT INTO orders (tenant_id,order_number,customer_name,origin_city,dest_city,total_items,total_value,status,sla_date,priority,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'standard',$10) ON CONFLICT DO NOTHING`,
      [TENANT_ID, num, cust, orig, dest, items_cnt, val, status, sla, ADMIN_ID]
    );
  }

  // Shipments
  const shipments = [
    ['SHP-2847', 'BlueDart',     'Air',  'TN-09-AB-3421', 'DEV-001', 'Mumbai',    'Delhi',      'IN_TRANSIT'],
    ['SHP-2848', 'DTDC',         'Road', 'DL-01-CA-5892', 'DEV-002', 'Chennai',   'Kolkata',    'IN_TRANSIT'],
    ['SHP-2849', 'Gati',         'Road', 'KA-05-MN-8823', 'DEV-003', 'Bangalore', 'Pune',       'DELAYED'   ],
    ['SHP-2850', 'FedEx India',  'Air',  'MH-12-GH-4411', 'DEV-004', 'Delhi',     'Hyderabad',  'IN_TRANSIT'],
    ['SHP-2851', 'Ecom Express', 'Road', null,             null,      'Surat',     'Jaipur',     'DELIVERED' ],
    ['SHP-2852', 'Delhivery',   'Rail',  null,             null,      'Pune',      'Chennai',    'IN_TRANSIT'],
    ['SHP-2853', 'BlueDart',    'Air',   'TN-09-XY-9901', 'DEV-005', 'Mumbai',    'Bangalore',  'IN_TRANSIT'],
    ['SHP-2854', 'CONCOR Rail', 'Rail',  null,             null,      'Delhi',     'Kolkata',    'IN_TRANSIT'],
  ];
  for (const [num, carrier, mode, veh, dev, orig, dest, status] of shipments) {
    await pool.query(
      `INSERT INTO shipments (tenant_id,shipment_number,carrier_name,transport_mode,vehicle_reg,device_id,origin_city,dest_city,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
      [TENANT_ID, num, carrier, mode, veh, dev, orig, dest, status]
    );
  }

  // Invoices
  const invoices = [
    ['INV-2025-0481', 'Tata Motors Ltd',       482500,  86850,  569350, 'PAID',    '2025-05-15'],
    ['INV-2025-0480', 'Reliance Industries',  1240000, 223200, 1463200, 'PENDING', '2025-05-10'],
    ['INV-2025-0479', 'Infosys Logistics',     218750,  39375,  258125, 'OVERDUE', '2025-04-30'],
    ['INV-2025-0478', 'Mahindra & Mahindra',   895000, 161100, 1056100, 'PENDING', '2025-05-20'],
    ['INV-2025-0477', 'Asian Paints Ltd',      162300,  29214,  191514, 'PAID',    '2025-04-25'],
    ['INV-2025-0476', 'HCL Technologies',      344800,  62064,  406864, 'OVERDUE', '2025-04-28'],
    ['INV-2025-0475', 'L&T Logistics',         980000, 176400, 1156400, 'PENDING', '2025-05-25'],
  ];
  for (const [num, cust, sub, tax, total, status, due] of invoices) {
    await pool.query(
      `INSERT INTO invoices (tenant_id,invoice_number,customer_name,subtotal,tax_amount,total_amount,currency,status,due_date)
       VALUES ($1,$2,$3,$4,$5,$6,'INR',$7,$8) ON CONFLICT DO NOTHING`,
      [TENANT_ID, num, cust, sub, tax, total, status, due]
    );
  }

  // Notification templates
  const templates = [
    ['SHIPMENT_DISPATCHED', 'Shipment Dispatched',  ['email','sms','push'],          'Shipment {{shipment_id}} dispatched',         'Your shipment {{shipment_id}} departed {{origin}} at {{time}}. ETA: {{eta}}.'],
    ['DELIVERY_COMPLETED',  'Delivery Completed',   ['email','push'],                'Shipment {{shipment_id}} delivered',          'Shipment {{shipment_id}} delivered to {{destination}} at {{delivered_at}}.'],
    ['DELAY_ALERT',         'Delay Alert',          ['email','sms','push','in-app'], 'Alert: Shipment {{shipment_id}} may be delayed','Shipment {{shipment_id}} is at SLA risk. ETA: {{eta}}. Reason: {{reason}}.'],
    ['GEOFENCE_ALERT',      'Geofence Alert',       ['email','sms','push','in-app'], 'Geofence: Vehicle {{vehicle_id}} {{event}}',  'Vehicle {{vehicle_id}} {{event}} geofence "{{fence_name}}" at {{time}}.'],
    ['INVOICE_GENERATED',   'Invoice Generated',    ['email'],                       'Invoice {{invoice_number}} — {{amount}}',     'Invoice {{invoice_number}} for {{amount}} ready. Due: {{due_date}}.'],
    ['EXCEPTION_DETECTED',  'Exception Detected',   ['email','sms','push','in-app'], 'URGENT: Exception on {{shipment_id}}',        'Anomaly on {{shipment_id}}: {{description}}. Immediate action required.'],
  ];
  for (const [code, name, channels, subject, body] of templates) {
    await pool.query(
      `INSERT INTO notification_templates (tenant_id,code,name,channels,subject_tpl,body_tpl,active)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE) ON CONFLICT DO NOTHING`,
      [TENANT_ID, code, name, channels, subject, body]
    );
  }

  // Integrations
  const integrations = [
    ['SAP S/4HANA',       'ERP',       'RFC/BAPI'],
    ['BlueDart API',      'Carrier',   'REST'],
    ['DTDC EDI',          'EDI',       'X12/EDIFACT'],
    ['Stripe Billing',    'Finance',   'REST'],
    ['Delhivery',         'Carrier',   'REST'],
    ['FedEx Web Services','Carrier',   'SOAP'],
    ['Customs ICEGate',   'Government','REST'],
    ['Google Maps API',   'Maps',      'REST'],
  ];
  for (const [name, type, protocol] of integrations) {
    await pool.query(
      `INSERT INTO integrations (tenant_id,name,type,protocol,status,active) VALUES ($1,$2,$3,$4,'CONNECTED',TRUE) ON CONFLICT DO NOTHING`,
      [TENANT_ID, name, type, protocol]
    );
  }

  console.log('[db] ✓ Demo data seeded successfully');
}
