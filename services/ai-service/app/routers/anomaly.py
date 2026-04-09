from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import random

router = APIRouter()

class TelemetryPoint(BaseModel):
    shipment_id: str
    lat: float
    lng: float
    temp_celsius: Optional[float] = None
    humidity: Optional[float] = None
    shock_g: Optional[float] = None
    speed_kmh: Optional[float] = None
    timestamp: str

class AnomalyResult(BaseModel):
    shipment_id: str
    anomaly_detected: bool
    anomaly_type: Optional[str]
    severity: str   # low | medium | high | critical
    confidence: float
    description: str
    recommended_action: str

ANOMALY_RULES = [
    {"field": "temp_celsius", "min": -5,  "max": 8,    "type": "temperature_breach",   "severity": "high"},
    {"field": "shock_g",      "min": 0,   "max": 3.0,  "type": "shock_event",          "severity": "medium"},
    {"field": "speed_kmh",    "min": 0,   "max": 120,  "type": "overspeed",            "severity": "medium"},
]

@router.post("/detect", response_model=AnomalyResult)
async def detect_anomaly(point: TelemetryPoint):
    data = point.dict()
    for rule in ANOMALY_RULES:
        field = rule["field"]
        val = data.get(field)
        if val is None:
            continue
        if val < rule["min"] or val > rule["max"]:
            return AnomalyResult(
                shipment_id=point.shipment_id,
                anomaly_detected=True,
                anomaly_type=rule["type"],
                severity=rule["severity"],
                confidence=round(0.88 + random.random() * 0.10, 3),
                description=f"{field} value {val} is outside acceptable range [{rule['min']}, {rule['max']}].",
                recommended_action=(
                    "Alert carrier and consignee. Dispatch rescue vehicle if critical."
                    if rule["severity"] == "critical"
                    else "Log incident. Notify operations team for review."
                ),
            )

    return AnomalyResult(
        shipment_id=point.shipment_id,
        anomaly_detected=False,
        anomaly_type=None,
        severity="low",
        confidence=0.97,
        description="All telemetry within normal parameters.",
        recommended_action="No action required.",
    )

@router.post("/batch", response_model=List[AnomalyResult])
async def detect_batch(points: List[TelemetryPoint]):
    results = []
    for p in points:
        results.append(await detect_anomaly(p))
    return results
