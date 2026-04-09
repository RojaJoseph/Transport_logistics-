-- ================================================================
-- TransportOS — PostgreSQL Schema
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Tenants ──────────────────────────────────────────────────────
CREATE TABLE tenants (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(200) NOT NULL UNIQUE,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    plan       VARCHAR(50)  NOT NULL DEFAULT 'enterprise',
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Users ────────────────────────────────────────────────────────
CREATE TABLE users (
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

CREATE TABLE user_permissions (
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    PRIMARY KEY (user_id, permission)
);

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID        REFERENCES tenants(id),
    user_id     UUID        REFERENCES users(id),
    user_name   VARCHAR(200),
    action      VARCHAR(100) NOT NULL,
    detail      TEXT,
    ip_address  INET,
    risk_level  VARCHAR(20)  NOT NULL DEFAULT 'low',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, created_at DESC);

-- ── Warehouses ───────────────────────────────────────────────────
CREATE TABLE warehouses (
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

-- ── Vendors ──────────────────────────────────────────────────────
CREATE TABLE vendors (
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

-- ── Inventory ────────────────────────────────────────────────────
CREATE TABLE inventory (
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
CREATE INDEX idx_inventory_sku ON inventory USING gin(sku gin_trgm_ops);

CREATE TABLE inventory_audit (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku        VARCHAR(100) NOT NULL,
    delta      INTEGER      NOT NULL,
    reason     TEXT,
    user_id    UUID,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Purchase Orders ──────────────────────────────────────────────
CREATE TABLE purchase_orders (
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

-- ── Orders ───────────────────────────────────────────────────────
CREATE TABLE orders (
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
CREATE INDEX idx_orders_status   ON orders(tenant_id, status);
CREATE INDEX idx_orders_customer ON orders USING gin(customer_name gin_trgm_ops);

CREATE TABLE order_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type  VARCHAR(100) NOT NULL,
    description TEXT,
    meta        JSONB,
    created_by  UUID         REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Shipments ────────────────────────────────────────────────────
CREATE TABLE shipments (
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
CREATE INDEX idx_shipments_status ON shipments(tenant_id, status);

-- ── Carriers ─────────────────────────────────────────────────────
CREATE TABLE carriers (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID         NOT NULL REFERENCES tenants(id),
    name          VARCHAR(200) NOT NULL,
    code          VARCHAR(50),
    modes         TEXT[]       NOT NULL DEFAULT '{}',
    api_endpoint  VARCHAR(500),
    api_key_enc   TEXT,
    contract_rate NUMERIC(10,4),
    on_time_pct   NUMERIC(5,2) NOT NULL DEFAULT 85.00,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Finance ──────────────────────────────────────────────────────
CREATE TABLE invoices (
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
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);

CREATE TABLE payments (
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

-- ── Notifications ────────────────────────────────────────────────
CREATE TABLE notification_templates (
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

CREATE TABLE notification_log (
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

-- ── Integrations ─────────────────────────────────────────────────
CREATE TABLE integrations (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID         NOT NULL REFERENCES tenants(id),
    name       VARCHAR(200) NOT NULL,
    type       VARCHAR(100) NOT NULL,
    protocol   VARCHAR(50)  NOT NULL,
    config     JSONB        NOT NULL DEFAULT '{}',
    status     VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    last_sync  TIMESTAMPTZ,
    error_msg  TEXT,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE integration_events (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID         NOT NULL REFERENCES integrations(id),
    event_type     VARCHAR(100) NOT NULL,
    direction      VARCHAR(10)  NOT NULL DEFAULT 'IN',
    payload        JSONB,
    status         VARCHAR(50)  NOT NULL DEFAULT 'SUCCESS',
    error_msg      TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_int_events ON integration_events(integration_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════
-- SEED DATA
-- ════════════════════════════════════════════════════════════════
INSERT INTO tenants (id, name, slug, plan) VALUES
    ('00000000-0000-0000-0000-000000000001', 'TransportOS Demo', 'demo', 'enterprise');

INSERT INTO users (id, tenant_id, email, name, role, mfa_enabled) VALUES
    ('00000000-0000-0000-0000-000000000010',
     '00000000-0000-0000-0000-000000000001',
     'admin@transportos.com', 'System Admin', 'SUPER_ADMIN', FALSE);

INSERT INTO warehouses (tenant_id, name, city, state, capacity_sqm, type, lat, lng) VALUES
    ('00000000-0000-0000-0000-000000000001','Mumbai Central Hub',    'Mumbai',    'Maharashtra',45000,'general', 19.0760, 72.8777),
    ('00000000-0000-0000-0000-000000000001','Delhi NCR Distribution','Gurugram',  'Haryana',    62000,'general', 28.4595, 77.0266),
    ('00000000-0000-0000-0000-000000000001','Chennai Port Depot',    'Chennai',   'Tamil Nadu', 38000,'port',    13.0827, 80.2707),
    ('00000000-0000-0000-0000-000000000001','Bangalore Tech DC',     'Bangalore', 'Karnataka',  28000,'general', 12.9716, 77.5946),
    ('00000000-0000-0000-0000-000000000001','Delhi Cold Chain',      'Delhi',     'Delhi',      12000,'cold',    28.7041, 77.1025);

INSERT INTO carriers (tenant_id, name, code, modes, on_time_pct) VALUES
    ('00000000-0000-0000-0000-000000000001','BlueDart',      'BDE','{"Air","Road"}',96.2),
    ('00000000-0000-0000-0000-000000000001','Delhivery',     'DEL','{"Road"}',      88.4),
    ('00000000-0000-0000-0000-000000000001','DTDC',          'DTC','{"Road","Rail"}',82.1),
    ('00000000-0000-0000-0000-000000000001','FedEx India',   'FDX','{"Air","Road"}',94.8),
    ('00000000-0000-0000-0000-000000000001','Gati',          'GAT','{"Road"}',      79.3),
    ('00000000-0000-0000-0000-000000000001','CONCOR Rail',   'CON','{"Rail"}',      91.0);

INSERT INTO notification_templates (tenant_id, code, name, channels, subject_tpl, body_tpl) VALUES
    ('00000000-0000-0000-0000-000000000001','SHIPMENT_DISPATCHED','Shipment Dispatched',
     '{"email","sms","push"}',
     'Shipment {{shipment_id}} dispatched',
     'Your shipment {{shipment_id}} departed {{origin}} at {{time}}. ETA: {{eta}}.'),
    ('00000000-0000-0000-0000-000000000001','DELIVERY_COMPLETED','Delivery Completed',
     '{"email","push"}',
     'Shipment {{shipment_id}} delivered',
     'Shipment {{shipment_id}} delivered to {{destination}} at {{delivered_at}}.'),
    ('00000000-0000-0000-0000-000000000001','DELAY_ALERT','Delay Alert',
     '{"email","sms","push","in-app"}',
     'Alert: Shipment {{shipment_id}} may be delayed',
     'Shipment {{shipment_id}} is at SLA risk. ETA: {{eta}}. Reason: {{reason}}.'),
    ('00000000-0000-0000-0000-000000000001','GEOFENCE_ALERT','Geofence Alert',
     '{"email","sms","push","in-app"}',
     'Geofence: Vehicle {{vehicle_id}} {{event}}',
     'Vehicle {{vehicle_id}} {{event}} geofence "{{fence_name}}" at {{time}}.'),
    ('00000000-0000-0000-0000-000000000001','INVOICE_GENERATED','Invoice Generated',
     '{"email"}',
     'Invoice {{invoice_number}} — {{amount}}',
     'Invoice {{invoice_number}} for {{amount}} ready. Due: {{due_date}}.'),
    ('00000000-0000-0000-0000-000000000001','EXCEPTION_DETECTED','Exception Detected',
     '{"email","sms","push","in-app"}',
     'URGENT: Exception on {{shipment_id}}',
     'Anomaly on {{shipment_id}}: {{description}}. Immediate action required.');
