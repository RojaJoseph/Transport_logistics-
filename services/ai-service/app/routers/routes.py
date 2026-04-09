from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import math, random

router = APIRouter()

class RouteRequest(BaseModel):
    origin: str
    destination: str
    weight_kg: float
    volume_cbm: float
    priority: str = "standard"   # standard | express | economy
    preferred_modes: Optional[List[str]] = None

class RouteOption(BaseModel):
    mode: str
    carrier: str
    cost_inr: float
    transit_hours: float
    co2_kg: float
    on_time_probability: float
    score: float

class RouteResponse(BaseModel):
    request_id: str
    origin: str
    destination: str
    recommended: RouteOption
    alternatives: List[RouteOption]
    ai_reasoning: str
    savings_vs_default: float

CARRIER_DATA = {
    "Road":  [("BlueDart Road", 18, 0.85, 0.78), ("Delhivery",   22, 0.78, 0.82), ("Gati",     20, 0.80, 0.75)],
    "Rail":  [("CONCOR",        36, 0.40, 0.88), ("Adani Ports", 38, 0.38, 0.90)],
    "Air":   [("BlueDart Air",   6, 2.40, 0.96), ("FedEx Air",    5, 2.60, 0.95)],
    "Sea":   [("MSC",          120, 0.18, 0.80), ("Maersk",     115, 0.20, 0.82)],
}

def compute_cost(base_rate: float, weight: float, hours: float, priority: str) -> float:
    multiplier = {"express": 1.8, "standard": 1.0, "economy": 0.75}.get(priority, 1.0)
    return round(base_rate * weight * multiplier + hours * 120, 2)

@router.post("/optimise", response_model=RouteResponse)
async def optimise_route(req: RouteRequest):
    import uuid
    options: List[RouteOption] = []
    modes = req.preferred_modes or list(CARRIER_DATA.keys())

    for mode, carriers in CARRIER_DATA.items():
        if mode not in modes:
            continue
        for carrier, hours, co2_rate, otp in carriers:
            cost = compute_cost(
                {"Road": 45, "Rail": 28, "Air": 180, "Sea": 12}[mode],
                req.weight_kg, hours, req.priority
            )
            co2 = round(co2_rate * req.weight_kg / 1000, 3)
            # Composite score: lower cost + lower time + lower co2 + higher OTP
            score = round(
                (1 - cost / 500_000) * 0.4
                + (1 - hours / 168) * 0.3
                + otp * 0.2
                + (1 - co2 / 10) * 0.1, 4
            )
            options.append(RouteOption(
                mode=mode, carrier=carrier, cost_inr=cost,
                transit_hours=hours, co2_kg=co2,
                on_time_probability=otp, score=score,
            ))

    if not options:
        raise HTTPException(status_code=400, detail="No viable routes found for given preferences")

    options.sort(key=lambda x: x.score, reverse=True)
    recommended = options[0]
    default_cost = options[-1].cost_inr if len(options) > 1 else recommended.cost_inr
    savings = round(default_cost - recommended.cost_inr, 2)

    return RouteResponse(
        request_id=str(uuid.uuid4()),
        origin=req.origin,
        destination=req.destination,
        recommended=recommended,
        alternatives=options[1:4],
        ai_reasoning=(
            f"Recommended {recommended.carrier} ({recommended.mode}) with {recommended.on_time_probability*100:.0f}% "
            f"on-time probability and ₹{recommended.cost_inr:,.0f} cost. "
            f"CO₂ footprint: {recommended.co2_kg} kg. "
            f"Score optimised across cost (40%), time (30%), reliability (20%) and sustainability (10%)."
        ),
        savings_vs_default=max(savings, 0),
    )

@router.get("/history")
async def route_history(limit: int = 20):
    """Return recent route optimisation requests (stub)."""
    return {"data": [], "total": 0}
