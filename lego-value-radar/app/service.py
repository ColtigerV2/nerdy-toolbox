from __future__ import annotations

from .bricklink_client import BrickLinkClient
from .scoring import RankedColor, rank_color


def rank_part_colors(
    client: BrickLinkClient,
    part_no: str,
    condition: str = "U",
    limit: int | None = None,
) -> list[RankedColor]:
    colors = client.get_known_colors(part_no)
    rankings: list[RankedColor] = []

    for color in colors:
        color_id = color.get("color_id")
        if color_id is None:
            continue

        try:
            guide = client.get_price_guide(part_no, int(color_id), condition=condition)
        except Exception:
            # Some part/color combinations may have no recent sales data.
            continue

        ranked = rank_color(
            part_no=part_no,
            color=color,
            price_guide=guide,
            condition=condition,
            currency=client.currency,
        )
        if ranked.total_quantity > 0 or ranked.qty_avg_price > 0:
            rankings.append(ranked)

    rankings.sort(key=lambda item: item.score, reverse=True)
    if limit is not None:
        return rankings[:limit]
    return rankings
