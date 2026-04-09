import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.routers import routes, forecast, anomaly, chat, optimise
from app.core.config import settings
from app.core.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="TransportOS AI Engine",
    description="Route optimisation · Demand forecasting · Anomaly detection · Load optimiser · AI Chat",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router,   prefix="/routes",   tags=["Route Optimisation"])
app.include_router(forecast.router, prefix="/forecast", tags=["Demand Forecasting"])
app.include_router(anomaly.router,  prefix="/anomaly",  tags=["Anomaly Detection"])
app.include_router(chat.router,     prefix="/chat",     tags=["AI Chat"])
app.include_router(optimise.router, prefix="/optimise", tags=["Load Optimisation"])

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "ai-engine",
        "anthropic_configured": bool(settings.ANTHROPIC_API_KEY),
        "openai_configured":    bool(settings.OPENAI_API_KEY),
    }

if __name__ == "__main__":
    # Render assigns $PORT dynamically; PORT_AI used for local Docker
    port = int(os.getenv("PORT") or os.getenv("PORT_AI", "8001"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False, log_level="info")
