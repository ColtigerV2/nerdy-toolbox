from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class RankedColor:
    part_no: str
    color_id: int
    color_name: str
    condition: str
    qty_avg_price: float
    avg_price: float
    min_price: float
    max_price: float
    unit_quantity: int
    total_quantity: int
    currency: str
    score: float


def as_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value or default)
    except (TypeError, ValueError):
        return default


def as_int(value: object, default: int = 0) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default


def calculate_score(qty_avg_price: float, total_quantity: int) -> float:
    """Prioritize colors with real value and some sales volume."""
    return qty_avg_price * math.log(total_quantity + 1)


def rank_color(part_no: str, color: dict, price_guide: dict, condition: str, currency: str) -> RankedColor:
    color_id = as_int(color.get("color_id"))
    color_name = color.get("color_name") or color.get("name") or f"Color {color_id}"
    qty_avg_price = as_float(price_guide.get("qty_avg_price"))
    avg_price = as_float(price_guide.get("avg_price"))
    min_price = as_float(price_guide.get("min_price"))
    max_price = as_float(price_guide.get("max_price"))
    unit_quantity = as_int(price_guide.get("unit_quantity"))
    total_quantity = as_int(price_guide.get("total_quantity"))
    score = calculate_score(qty_avg_price, total_quantity)

    return RankedColor(
        part_no=part_no,
        color_id=color_id,
        color_name=color_name,
        condition=condition,
        qty_avg_price=qty_avg_price,
        avg_price=avg_price,
        min_price=min_price,
        max_price=max_price,
        unit_quantity=unit_quantity,
        total_quantity=total_quantity,
        currency=currency,
        score=score,
    )
