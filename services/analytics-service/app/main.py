import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg, json
from datetime import date, timedelta
import random, math

# ── DB connection — Docker service hostname ───────────────────────
PG_DSN = os.getenv(
    "DATABASE_URL",
    f"postgresql://logistics:secret@postgres:5432/logistics"
)
PG_DSN = PG_DSN.replace("postgresql+asyncpg://", "postgresql://")

pg_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pg_pool
    try:
        pg_pool = await asyncpg.create_pool(PG_DSN, min_size=2, max_size=10)
        print(f"[analytics] PostgreSQL connected")
    except Exception as e:
        print(f"[analytics] PostgreSQL unavailable — demo mode: {e}")
    yield
    if pg_pool:
        await pg_pool.close()

app = FastAPI(
    title="TransportOS Analytics",
    description="KPIs · Trends · Carrier Performance · Finance · AI Savings",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Demo data helpers ─────────────────────────────────────────────
def demo_trend(days: int):
    return [
        {
            "date": str(date.today() - timedelta(days=days-i)),
            "total":     int(800 + 200*math.sin(i/7*math.pi) + random.randint(-50, 50)),
            "delivered": int(700 + 150*math.sin(i/7*math.pi)),
            "delayed":   int(30  + random.randint(0, 40)),
        }
        for i in range(days)
    ]

DEMO_KPI = {
    "active_shipments": 4821, "orders_today": 1247, "pending_orders": 342,
    "revenue_mtd": 42000000.0, "delayed_shipments": 218, "otd_pct": 94.3,
}

@app.get("/health")
async def health():
    return {
        "status": "ok", "service": "analytics",
        "db_connected": pg_pool is not None,
        "mode": "live" if pg_pool else "demo",
    }

@app.get("/kpi/summary")
async def kpi_summary():
    if not pg_pool:
        return DEMO_KPI
    try:
        rows = await pg_pool.fetch("""
            SELECT
              (SELECT COUNT(*) FROM shipments WHERE status='IN_TRANSIT')    AS active_shipments,
              (SELECT COUNT(*) FROM orders    WHERE DATE_TRUNC('day',created_at)=CURRENT_DATE) AS orders_today,
              (SELECT COUNT(*) FROM orders    WHERE status='PENDING')        AS pending_orders,
              (SELECT COALESCE(SUM(total_amount),0) FROM invoices
               WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())) AS revenue_mtd,
              (SELECT COUNT(*) FROM shipments WHERE status='DELAYED')        AS delayed_shipments,
              (SELECT ROUND(AVG(CASE WHEN status='DELIVERED' THEN 1.0 ELSE 0 END)*100,1)
               FROM shipments WHERE created_at>NOW()-INTERVAL '30 days')    AS otd_pct
        """)
        r = dict(rows[0])
        return {k: float(v) if v is not None else 0 for k, v in r.items()}
    except Exception:
        return DEMO_KPI

@app.get("/trends/shipments")
async def shipment_trend(days: int = Query(30, ge=7, le=365)):
    if not pg_pool:
        return {"data": demo_trend(days)}
    try:
        rows = await pg_pool.fetch("""
            SELECT DATE_TRUNC('day',created_at)::date AS date,
                   COUNT(*) AS total,
                   COUNT(CASE WHEN status='DELIVERED' THEN 1 END) AS delivered,
                   COUNT(CASE WHEN status='DELAYED'   THEN 1 END) AS delayed
            FROM shipments WHERE created_at >= NOW()-INTERVAL '1 day'*$1
            GROUP BY 1 ORDER BY 1
        """, days)
        return {"data": [dict(r) for r in rows]}
    except Exception:
        return {"data": demo_trend(days)}

@app.get("/trends/revenue")
async def revenue_trend(months: int = Query(12, ge=1, le=24)):
    if not pg_pool:
        return {"data": [
            {"month": f"2025-{str(m+1).zfill(2)}-01",
             "revenue":   3000000 + random.randint(0, 2000000),
             "collected": 2500000 + random.randint(0, 1500000)}
            for m in range(months)
        ]}
    rows = await pg_pool.fetch("""
        SELECT DATE_TRUNC('month',created_at)::date AS month,
               COALESCE(SUM(total_amount),0) AS revenue,
               COALESCE(SUM(CASE WHEN status='PAID' THEN total_amount ELSE 0 END),0) AS collected
        FROM invoices WHERE created_at >= NOW()-INTERVAL '1 month'*$1
        GROUP BY 1 ORDER BY 1
    """, months)
    return {"data": [dict(r) for r in rows]}

@app.get("/routes/top")
async def top_routes(limit: int = Query(10, ge=1, le=50)):
    if not pg_pool:
        return {"data": [
            {"origin_city": o, "dest_city": d, "shipment_count": c, "avg_value": v}
            for o, d, c, v in [
                ("Mumbai","Delhi",3420,82400), ("Chennai","Kolkata",2810,51400),
                ("Bangalore","Pune",2200,32000), ("Hyderabad","Surat",1950,44800),
                ("Ahmedabad","Jaipur",1450,28600),
            ]
        ]}
    rows = await pg_pool.fetch("""
        SELECT origin_city, dest_city, COUNT(*) AS shipment_count,
               ROUND(AVG(total_value)::numeric,2) AS avg_value
        FROM orders WHERE created_at > NOW()-INTERVAL '90 days'
        GROUP BY 1,2 ORDER BY 3 DESC LIMIT $1
    """, limit)
    return {"data": [dict(r) for r in rows]}

@app.get("/carriers/performance")
async def carrier_performance():
    if not pg_pool:
        return {"data": [
            {"carrier_name": c, "total": t, "delivered": d, "delayed": dl, "otd_pct": p}
            for c, t, d, dl, p in [
                ("BlueDart",530,510,8,96.2), ("FedEx",420,398,12,94.8),
                ("CONCOR",380,346,20,91.0), ("Delhivery",610,540,48,88.5),
                ("DTDC",490,402,64,82.0), ("Gati",310,245,44,79.0),
            ]
        ]}
    rows = await pg_pool.fetch("""
        SELECT carrier_name, COUNT(*) AS total,
               COUNT(CASE WHEN status='DELIVERED' THEN 1 END) AS delivered,
               COUNT(CASE WHEN status='DELAYED'   THEN 1 END) AS delayed,
               ROUND(COUNT(CASE WHEN status='DELIVERED' THEN 1 END)*100.0/NULLIF(COUNT(*),0),1) AS otd_pct
        FROM shipments WHERE carrier_name IS NOT NULL AND created_at>NOW()-INTERVAL '30 days'
        GROUP BY 1 ORDER BY total DESC
    """)
    return {"data": [dict(r) for r in rows]}

@app.get("/finance/summary")
async def finance_summary():
    if not pg_pool:
        return {"paid":40000000.0,"pending":18000000.0,"overdue":4840000.0,
                "total_invoices":7,"collection_rate":78.4}
    rows = await pg_pool.fetch("""
        SELECT
          COALESCE(SUM(CASE WHEN status='PAID'    THEN total_amount ELSE 0 END),0) AS paid,
          COALESCE(SUM(CASE WHEN status='PENDING' THEN total_amount ELSE 0 END),0) AS pending,
          COALESCE(SUM(CASE WHEN status='OVERDUE' THEN total_amount ELSE 0 END),0) AS overdue,
          COUNT(*) AS total_invoices,
          ROUND(COALESCE(SUM(CASE WHEN status='PAID' THEN total_amount ELSE 0 END),0)*100.0
                /NULLIF(SUM(total_amount),0),1) AS collection_rate
        FROM invoices WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())
    """)
    r = dict(rows[0])
    return {k: float(v) if v is not None else 0 for k, v in r.items()}

@app.get("/transport/modes")
async def transport_modes():
    if not pg_pool:
        return {"data":[
            {"transport_mode":"Road","count":2310,"pct":48.0},
            {"transport_mode":"Rail","count":1056,"pct":22.0},
            {"transport_mode":"Air", "count":865, "pct":18.0},
            {"transport_mode":"Sea", "count":577, "pct":12.0},
        ]}
    rows = await pg_pool.fetch("""
        SELECT transport_mode, COUNT(*) AS count,
               ROUND(COUNT(*)*100.0/NULLIF((SELECT COUNT(*) FROM shipments
               WHERE created_at>NOW()-INTERVAL '30 days'),0),1) AS pct
        FROM shipments WHERE created_at>NOW()-INTERVAL '30 days'
        GROUP BY 1 ORDER BY 2 DESC
    """)
    return {"data": [dict(r) for r in rows]}

@app.get("/ai/savings")
async def ai_savings():
    return {
        "mtd_savings_inr": 1_280_000,
        "route_optimisations": 4821,
        "avg_saving_per_route": 265.5,
        "load_utilisation_gain_pct": 22.3,
        "co2_saved_kg": 8420,
        "breakdown": [
            {"category": "Route Optimisation", "savings_inr": 720_000},
            {"category": "Load Consolidation",  "savings_inr": 340_000},
            {"category": "Carrier Selection",    "savings_inr": 180_000},
            {"category": "Idle Time Reduction",  "savings_inr":  40_000},
        ],
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT_ANALYTICS", 4010))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False, log_level="info")
