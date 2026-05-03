from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Iterable

from .scoring import RankedColor


SCHEMA = """
CREATE TABLE IF NOT EXISTS price_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_no TEXT NOT NULL,
    color_id INTEGER NOT NULL,
    color_name TEXT NOT NULL,
    condition TEXT NOT NULL,
    qty_avg_price REAL NOT NULL,
    avg_price REAL NOT NULL,
    min_price REAL NOT NULL,
    max_price REAL NOT NULL,
    unit_quantity INTEGER NOT NULL,
    total_quantity INTEGER NOT NULL,
    currency TEXT NOT NULL,
    score REAL NOT NULL,
    fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_part
ON price_snapshots(part_no, condition, fetched_at);
"""


def connect(database_path: str) -> sqlite3.Connection:
    Path(os.path.dirname(database_path)).mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(database_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def save_rankings(conn: sqlite3.Connection, rankings: Iterable[RankedColor]) -> None:
    conn.executemany(
        """
        INSERT INTO price_snapshots (
            part_no, color_id, color_name, condition, qty_avg_price, avg_price,
            min_price, max_price, unit_quantity, total_quantity, currency, score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                item.part_no,
                item.color_id,
                item.color_name,
                item.condition,
                item.qty_avg_price,
                item.avg_price,
                item.min_price,
                item.max_price,
                item.unit_quantity,
                item.total_quantity,
                item.currency,
                item.score,
            )
            for item in rankings
        ],
    )
    conn.commit()
