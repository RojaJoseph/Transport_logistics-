# 🚀 TransportOS — Render.com Deployment Guide
## No Docker · Native Buildpacks · Auto DB Bootstrap

---

## What happens when you deploy

| Step | What Render does |
|------|-----------------|
| 1 | Reads `render.yaml` from your GitHub repo |
| 2 | Creates a managed **PostgreSQL** database |
| 3 | Deploys 10 Node.js services (`npm install && npm run build` → `node dist/index.js`) |
| 4 | Deploys 2 Python FastAPI services (`pip install -r requirements.txt` → `uvicorn`) |
| 5 | Deploys React frontend (`npm install && npm run build` → `serve dist`) |
| 6 | Wires all service URLs together via environment variables |
| 7 | Each service calls `bootstrapDatabase()` on first start → **creates all 20 tables + seeds demo data automatically** |

**Total time: ~8–12 minutes for first deploy**

---

## Step-by-Step

### 1. Push to GitHub

```bash
cd F:\Tranport_logistics

git init                          # only if not already a git repo
git add .
git commit -m "TransportOS - no Docker, Render native buildpacks"

# Create repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/transportos.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Render

1. Go to **render.com** → Sign in (use GitHub)
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Render finds `render.yaml` automatically
5. Click **Apply** → all 13 services start deploying

### 3. Set optional API keys (after deploy)

In each service's Render dashboard → **Environment** tab:

| Service | Key | Where to get |
|---------|-----|-------------|
| `transportos-ai` | `ANTHROPIC_API_KEY` | console.anthropic.com |
| `transportos-ai` | `OPENAI_API_KEY` | platform.openai.com |
| `transportos-finance` | `STRIPE_SECRET_KEY` | dashboard.stripe.com |
| `transportos-notify` | `SENDGRID_API_KEY` | app.sendgrid.com |
| `transportos-notify` | `TWILIO_ACCOUNT_SID` | console.twilio.com |

> All services work in demo mode without these keys.

### 4. Access your deployment

After deploy completes, Render gives you URLs like:
```
Frontend:  https://transportos-frontend.onrender.com
Gateway:   https://transportos-gateway.onrender.com
AI Docs:   https://transportos-ai.onrender.com/docs
Analytics: https://transportos-analytics.onrender.com/docs
```

**Login:** `admin@transportos.com` / any password ✅

---

## Services deployed

| # | Service | Type | Port |
|---|---------|------|------|
| 1 | `transportos-identity` | Node.js | auto |
| 2 | `transportos-erp` | Node.js | auto |
| 3 | `transportos-transport` | Node.js | auto |
| 4 | `transportos-tracking` | Node.js | auto |
| 5 | `transportos-orders` | Node.js | auto |
| 6 | `transportos-finance` | Node.js | auto |
| 7 | `transportos-notify` | Node.js | auto |
| 8 | `transportos-integration` | Node.js | auto |
| 9 | `transportos-analytics` | Python FastAPI | auto |
| 10 | `transportos-ai` | Python FastAPI | auto |
| 11 | `transportos-gateway` | Node.js | auto |
| 12 | `transportos-frontend` | Node.js (serve) | auto |
| — | `transportos-db` | PostgreSQL | managed |

---

## Re-deploy after code changes

```bash
git add .
git commit -m "your change description"
git push
```

Render auto-deploys within 2–3 minutes. No manual steps needed.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails: `tsc not found` | The `tsconfig.json` is in each service — check it exists |
| Build fails: `Cannot find module` | Run `npm install` locally in that service to check deps |
| Service crashes on start | Check Render logs — usually a missing `DATABASE_URL` |
| DB tables missing | The service auto-creates them — check if `bootstrapDatabase` is called in `index.ts` |
| Python `ModuleNotFoundError` | Check `requirements.txt` is in the service root |
| Frontend shows blank page | Check `VITE_API_GATEWAY` env var is set to the gateway URL |

---

## Local development (no Render needed)

```bash
# Install everything
npm run install:all

# Start all services
npm run dev

# Frontend → http://localhost:3000
# Gateway  → http://localhost:4000
# AI docs  → http://localhost:8001/docs
```
