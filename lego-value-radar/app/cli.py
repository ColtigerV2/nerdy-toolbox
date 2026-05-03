from __future__ import annotations

import argparse

from .bricklink_client import BrickLinkClient
from .config import get_settings
from .database import connect, save_rankings
from .service import rank_part_colors


def print_table(rows):
    if not rows:
        print("No price data found.")
        return

    header = f"{'#':>2}  {'Color':<28} {'QtyAvg':>10} {'SoldQty':>8} {'Units':>8} {'Score':>10}"
    print(header)
    print("-" * len(header))
    for idx, item in enumerate(rows, start=1):
        print(
            f"{idx:>2}  {item.color_name:<28} "
            f"{item.qty_avg_price:>10.2f} "
            f"{item.total_quantity:>8} "
            f"{item.unit_quantity:>8} "
            f"{item.score:>10.2f}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Rank BrickLink colors for a LEGO part.")
    parser.add_argument("part_no", help="BrickLink part number, e.g. 3031")
    parser.add_argument("--condition", choices=["U", "N"], default="U", help="U=used, N=new")
    parser.add_argument("--limit", type=int, default=25, help="Number of rows to show")
    parser.add_argument("--no-cache", action="store_true", help="Do not store results in SQLite")
    args = parser.parse_args()

    settings = get_settings()
    client = BrickLinkClient(settings)
    rankings = rank_part_colors(client, args.part_no, condition=args.condition, limit=args.limit)

    if not args.no_cache:
        conn = connect(settings.database_path)
        save_rankings(conn, rankings)

    print(f"\nPart {args.part_no} | condition={args.condition} | currency={settings.bricklink_currency}\n")
    print_table(rankings)


if __name__ == "__main__":
    main()
