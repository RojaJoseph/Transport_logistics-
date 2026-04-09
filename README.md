# 🚛 TransportOS — Enterprise Logistics Platform

**Full production-ready system running 100% on localhost.**
No Docker. No cloud. Just `npm run dev`.

---

## 📋 Prerequisites — Install Once

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | 20+ | https://nodejs.org |
| **Python** | 3.11+ | https://python.org |
| **PostgreSQL** | 16 | https://postgresql.org/download/windows |
| **MongoDB** | 7 | https://www.mongodb.com/try/download/community |
| **Redis** | 7 | https://github.com/microsoftarchive/redis/releases |
| **Mosquitto** | 2.x | https://mosquitto.org/download |

> **Verify**: `npm run check:deps`

---

## 🚀 First-Time Setup

```bash
# 1. Copy environment file
copy .env.example .env

# 2. Install all npm + pip dependencies (takes ~3 min)
npm run install:all

# 3. Start PostgreSQL, MongoDB, Redis, Mosquitto
#    (Make sure these are running before continuing)

# 4. Create database and apply schema
npm run db:init

# 5. Seed sample demo data
npm run db:seed
```

---

## ▶️ Start the Platform

```bash
# Option A — Double-click (Windows)
start.bat

# Option B — Terminal
npm run dev
```

All **12 services** start simultaneously with colour-coded output.

---

## 🌐 Service URLs

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend Dashboard** | http://localhost:3000 | React 18 + Vite |
| **API Gateway** | http://localhost:4000 | JWT auth + proxy |
| **ERP Service** | http://localhost:4001 | Inventory · Vendors · POs |
| **Transport Service** | http://localhost:4002 | Shipments · Carriers |
| **GPS Tracking** | http://localhost:4003 | MQTT · Socket.IO · MongoDB |
| **Identity Service** | http://localhost:4005 | Auth · RBAC · MFA |
| **Finance Service** | http://localhost:4006 | Invoices · Stripe |
| **Order Service** | http://localhost:4007 | Order lifecycle |
| **Notifications** | http://localhost:4008 | Email · SMS · Push |
| **Integrations** | http://localhost:4009 | Carriers · EDI · Webhooks |
| **Analytics** | http://localhost:4010 | BI · KPIs · Trends |
| **AI Engine** | http://localhost:8001 | Routes · Forecast · Chat |
| **AI Swagger** | http://localhost:8001/docs | Interactive API docs |
| **Analytics Swagger** | http://localhost:4010/docs | Interactive API docs |

---

## 🔑 Demo Login

| Field | Value |
|-------|-------|
| Email | `admin@transportos.com` |
| Password | *(any — demo mode)* |

---

## 📂 Project Structure

```
Tranport_logistics/
├── frontend/                    # React 18 + Vite          → :3000
│   └── src/
│       ├── modules/             # 10 module pages
│       ├── components/          # Sidebar, Topbar, Layout
│       ├── store/               # Zustand (auth, notifications)
│       └── lib/api.ts           # Axios client
├── services/
│   ├── api-gateway/             # Express JWT proxy         → :4000
│   ├── erp-service/             # Node.js + PostgreSQL      → :4001
│   ├── transport-service/       # Node.js + PostgreSQL      → :4002
│   ├── tracking-service/        # Node.js + MongoDB + MQTT  → :4003
│   ├── identity-service/        # Node.js + JWT + MFA       → :4005
│   ├── finance-service/         # Node.js + Stripe          → :4006
│   ├── order-service/           # Node.js + PostgreSQL      → :4007
│   ├── notification-service/    # Node.js + SendGrid/Twilio → :4008
│   ├── integration-service/     # Node.js + EDI/Webhooks    → :4009
│   ├── analytics-service/       # Python FastAPI            → :4010
│   └── ai-service/              # Python FastAPI + Claude   → :8001
├── infra/
│   ├── postgres/init.sql        # Full DB schema + seed
│   └── mosquitto/mosquitto.conf # MQTT broker config
├── scripts/
│   ├── check-deps.js            # Validate prerequisites
│   ├── install-all.js           # npm + pip install
│   ├── db-init.js               # Create DB + apply schema
│   ├── db-seed.js               # Insert sample data
│   └── build-all.js             # Production build
├── .env.example                 # Copy → .env
├── package.json                 # Monorepo root
├── start.bat                    # Windows one-click launcher
└── README.md
```

---

## 🗄️ Manual Database Setup

If `npm run db:init` fails, run in psql:

```sql
-- Connect as postgres superuser
CREATE USER logistics WITH PASSWORD 'secret';
CREATE DATABASE logistics OWNER logistics;
GRANT ALL PRIVILEGES ON DATABASE logistics TO logistics;
\c logistics
\i F:/Tranport_logistics/infra/postgres/init.sql
```

---

## 📡 GPS Device Integration

**Hardware trackers via MQTT:**
```
Broker:  localhost:1883
Topic:   gps/{deviceId}/position
Payload: {
  "lat": 19.0760, "lng": 72.8777,
  "speed": 62, "heading": 245,
  "temp": 24.1, "fuel": 78,
  "engine": true, "ts": 1712400000000
}
```

**Mobile / web SDK via HTTP:**
```
POST http://localhost:4003/positions/ingest
{
  "deviceId": "DEV-001",
  "shipmentId": "SHP-2847",
  "vehicleId": "TN-09-AB-3421",
  "lat": 19.0760, "lng": 72.8777,
  "speed": 62
}
```

---

## 🧠 AI Engine

Set in `.env` to enable the chat assistant:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Without a key, the AI module shows demo responses.

---

## 💳 Stripe Payments

Set in `.env` to enable live invoice payments:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
Without keys, finance module works in demo mode.

---

## 📧 Notifications

Set in `.env` to send real emails/SMS:
```
SENDGRID_API_KEY=SG....
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```
Without keys, notifications are logged to console.

---

## 🛠 Individual Service Commands

```bash
npm run dev:frontend    # Frontend only  (port 3000)
npm run dev:gateway     # API Gateway    (port 4000)
npm run dev:erp         # ERP Service    (port 4001)
npm run dev:transport   # Transport      (port 4002)
npm run dev:tracking    # GPS Tracking   (port 4003)
npm run dev:identity    # Identity/Auth  (port 4005)
npm run dev:finance     # Finance        (port 4006)
npm run dev:orders      # Orders         (port 4007)
npm run dev:notify      # Notifications  (port 4008)
npm run dev:integrate   # Integrations   (port 4009)
npm run dev:analytics   # Analytics      (port 4010)
npm run dev:ai          # AI Engine      (port 8001)
```

---

## ⚠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| Port already in use | Change `PORT_*` in `.env` |
| PostgreSQL connection refused | Start PostgreSQL service |
| `psql: command not found` | Add PostgreSQL bin to PATH |
| MongoDB not connecting | Run `mongod --dbpath C:\data\db` |
| Redis not connecting | Run `redis-server` |
| MQTT not connecting | Run `mosquitto -c infra\mosquitto\mosquitto.conf` |
| `ts-node-dev not found` | Run `npm install` in the service directory |
| Python import error | Run `pip install -r requirements.txt` in service dir |
| AI service crashes | Ensure Python 3.11+ is installed |

---

## 🏭 Production Build

```bash
npm run build:all
```

Then serve each service with `npm start` instead of `npm run dev`.

---

## 📊 Demo Data Included

After `npm run db:seed`:
- **8 vendors** (Tata Motors, Reliance, Infosys, etc.)
- **8 inventory SKUs** with stock levels
- **8 sample orders** across all statuses
- **8 active shipments** with device assignments
- **7 invoices** (Paid, Pending, Overdue)
- **5 additional users** with different roles
- **6 warehouse** locations across India
- **6 carrier** records with OTD metrics
- **6 notification** templates pre-configured
