from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class LoadItem(BaseModel):
    id: str
    weight_kg: float
    length_cm: float
    width_cm: float
    height_cm: float
    fragile: bool = False

class Vehicle(BaseModel):
    id: str
    max_weight_kg: float
    length_cm: float
    width_cm: float
    height_cm: float

class LoadPlan(BaseModel):
    vehicle_id: str
    items_loaded: List[str]
    utilisation_pct: float
    weight_used_kg: float
    volume_used_cbm: float
    unloaded_items: List[str]

@router.post("/load", response_model=LoadPlan)
async def optimise_load(vehicle: Vehicle, items: List[LoadItem]):
    """
    Greedy bin-packing: sort items by volume descending, pack until limits reached.
    Production version would use 3D bin-packing with rotation (OR-Tools / py3dbp).
    """
    vol_vehicle = (vehicle.length_cm * vehicle.width_cm * vehicle.height_cm) / 1_000_000  # m³

    items_sorted = sorted(items, key=lambda i: i.length_cm * i.width_cm * i.height_cm, reverse=True)
    loaded = []
    weight_used = 0.0
    vol_used = 0.0

    for item in items_sorted:
        item_vol = (item.length_cm * item.width_cm * item.height_cm) / 1_000_000
        if (weight_used + item.weight_kg <= vehicle.max_weight_kg and
                vol_used + item_vol <= vol_vehicle):
            loaded.append(item.id)
            weight_used += item.weight_kg
            vol_used += item_vol

    unloaded = [i.id for i in items if i.id not in loaded]
    util = round((vol_used / vol_vehicle) * 100, 1) if vol_vehicle > 0 else 0.0

    return LoadPlan(
        vehicle_id=vehicle.id,
        items_loaded=loaded,
        utilisation_pct=util,
        weight_used_kg=round(weight_used, 2),
        volume_used_cbm=round(vol_used, 4),
        unloaded_items=unloaded,
    )
