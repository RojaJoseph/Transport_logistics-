# TransportOS — Render Deployment Guide
# Frontend already live: https://transport-logistics-u3dc.onrender.com

## Architecture on Render
```
Browser → Frontend (already deployed)
            ↓
        api-gateway  (single entry point)
            ↓ routes to
  ┌─────────────────────────────────────────┐
  │  identity  erp  transport  tracking     │
  │  order  finance  notify  integrate      │
  │  analytics  ai                          │
  └─────────────────────────────────────────┘
            ↓ shared databases
  PostgreSQL (Render managed)
  Redis      (Render managed)
  MongoDB    (MongoDB Atlas — free)
```

---

## STEP 1 — Get MongoDB Atlas (free, 5 min)

Tracking-service needs MongoDB for GPS history.

1. Go to https://cloud.mongodb.com → Sign up free
2. Create a free **M0 cluster** (512MB — enough for GPS data)
3. Database Access → Add user → username: `logistics`, save the password
4. Network Access → Add IP → `0.0.0.0/0` (allow all — fine for free tier)
5. Click "Connect" → "Drivers" → copy the connection string:
   `mongodb+srv://logistics:<password>@cluster0.xxxxx.mongodb.net/tracking`
6. **Save this string** — you'll need it in Step 4

---

## STEP 2 — Push project to GitHub

```bash
cd F:\Tranport_logistics
git init                          # if not already a git repo
git add .
git commit -m "production: render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/transport-logistics.git
git push -u origin main
```

> Make sure `.env` is in `.gitignore` — NEVER push secrets to GitHub!

---

## STEP 3 — Deploy via Render Blueprint (deploys all 11 services at once)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub account → select the `transport-logistics` repo
4. Render detects `render.yaml` automatically
5. Click **"Apply"** — Render will create:
   - 1 PostgreSQL database
   - 1 Redis instance
   - 11 web services
6. Wait ~10 minutes for all services to build and deploy

---

## STEP 4 — Set secret environment variables

After deploy, some env vars marked `sync: false` need to be set manually.
Go to each service in Render dashboard → **Environment** tab:

### On EVERY service that shows ⚠️ (sync: false):

| Service | Variable | Value |
|---------|----------|-------|
| identity-service | `JWT_SECRET` | `b66852580470a6dd1110b8c46350853c7ff28cc61859b7b9aa19c85a3878471bdca2d9361e2fdca79b6e3507bacdf44dd52dd90fe6a73e9c27db1c4c820f17cb` |
| api-gateway | `JWT_SECRET` | same as above |
| api-gateway | `ALLOWED_ORIGINS` | `https://transport-logistics-u3dc.onrender.com` |
| tracking-service | `MONGO_URL` | your MongoDB Atlas string from Step 1 |
| analytics-service | `ALLOWED_ORIGINS` | `https://transport-logistics-u3dc.onrender.com` |
| ai-service | `ALLOWED_ORIGINS` | `https://transport-logistics-u3dc.onrender.com` |

---

## STEP 5 — Wire up the api-gateway (most important step)

After all services deploy, each gets a URL like:
`https://transportos-identity-service.onrender.com`

Go to **api-gateway** service → **Environment** tab → set these:

```
SERVICE_IDENTITY  = https://transportos-identity-service.onrender.com
SERVICE_ERP       = https://transportos-erp-service.onrender.com
SERVICE_TRANSPORT = https://transportos-transport-service.onrender.com
SERVICE_TRACKING  = https://transportos-tracking-service.onrender.com
SERVICE_AI        = https://transportos-ai-service.onrender.com
SERVICE_FINANCE   = https://transportos-finance-service.onrender.com
SERVICE_ORDERS    = https://transportos-order-service.onrender.com
SERVICE_NOTIFY    = https://transportos-notification-service.onrender.com
SERVICE_INTEGRATE = https://transportos-integration-service.onrender.com
SERVICE_ANALYTICS = https://transportos-analytics-service.onrender.com
```

> Note: Render may add a random suffix to your service names if there's a conflict.
> Check the actual URL in each service's dashboard page.

Click **"Save Changes"** → api-gateway auto-redeploys.

---

## STEP 6 — Update the frontend to point to api-gateway

1. Go to Render dashboard → your **frontend** service
   (https://transport-logistics-u3dc.onrender.com)
2. **Environment** tab → set:
   ```
   VITE_API_GATEWAY = https://transportos-api-gateway.onrender.com/api
   ```
   
   Wait — your frontend uses `/api` as base URL (nginx proxy).
   Since the frontend is a **static site** on Render, set:
   ```
   VITE_API_GATEWAY = https://transportos-api-gateway.onrender.com
   ```
3. **Manual Deploy** → trigger a redeploy

---

## STEP 7 — Verify everything is working

Test each service health endpoint:
```
https://transportos-api-gateway.onrender.com/health
https://transportos-identity-service.onrender.com/health
https://transportos-erp-service.onrender.com/health
https://transportos-transport-service.onrender.com/health
https://transportos-tracking-service.onrender.com/health
https://transportos-order-service.onrender.com/health
https://transportos-finance-service.onrender.com/health
https://transportos-notification-service.onrender.com/health
https://transportos-integration-service.onrender.com/health
https://transportos-analytics-service.onrender.com/health
https://transportos-ai-service.onrender.com/health
```

All should return: `{"status":"ok","service":"..."}`

---

## Free Tier Limitations & Tips

| Limitation | Impact | Fix |
|-----------|--------|-----|
| Services **spin down** after 15min inactivity | First request takes ~30s to wake | Use UptimeRobot to ping `/health` every 14min |
| PostgreSQL **1GB** storage | Fine for demo/small team | Upgrade to $7/mo when needed |
| Redis **25MB** | Fine for sessions/cache | Upgrade when needed |
| **750 hours/month** per free service | 11 services × 24h = 264h/day — exceeds free! | Keep only critical services on free; upgrade others to $7/mo |

### Recommended: Run only 4 services free, upgrade the rest
Or use **Render's $7/month** instances — 11 × $7 = $77/month for full production.

---

## Run a UptimeRobot ping to prevent sleep (free)

1. Go to https://uptimerobot.com → free account
2. Add monitor → HTTP → URL: `https://transportos-api-gateway.onrender.com/health`
3. Interval: **5 minutes**
4. Repeat for all 11 services

This keeps all services warm and responsive.

---

## Database initialization

After first deploy, run the SQL init script on your Render PostgreSQL:

1. Render dashboard → **transportos-postgres** → **Connect** tab
2. Copy the **PSQL Command** and run it in your terminal
3. Then run: `\i infra/postgres/init.sql`

Or use a DB tool like **TablePlus** or **DBeaver** with the external connection string.
