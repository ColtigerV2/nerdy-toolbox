from __future__ import annotations

from typing import Any

import requests
from requests_oauthlib import OAuth1

from .config import Settings


class BrickLinkError(RuntimeError):
    pass


class BrickLinkClient:
    """Small BrickLink API client for the LEGO Value Radar MVP."""

    BASE_URL = "https://api.bricklink.com/api/store/v1"

    def __init__(self, settings: Settings):
        if not settings.is_bricklink_configured:
            raise BrickLinkError(
                "BrickLink API credentials are missing. Copy .env.example to .env and fill in the keys."
            )

        self.currency = settings.bricklink_currency
        self.auth = OAuth1(
            settings.bricklink_consumer_key,
            settings.bricklink_consumer_secret,
            settings.bricklink_token,
            settings.bricklink_token_secret,
        )

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{self.BASE_URL}{path}"
        response = requests.get(url, auth=self.auth, params=params, timeout=30)
        if response.status_code >= 400:
            raise BrickLinkError(f"BrickLink request failed: {response.status_code} {response.text}")

        payload = response.json()
        if payload.get("meta", {}).get("code") != 200:
            raise BrickLinkError(f"BrickLink API error: {payload}")
        return payload.get("data")

    def get_part(self, part_no: str) -> dict[str, Any]:
        return self._get(f"/items/PART/{part_no}")

    def get_known_colors(self, part_no: str) -> list[dict[str, Any]]:
        return self._get(f"/items/PART/{part_no}/colors")

    def get_price_guide(
        self,
        part_no: str,
        color_id: int,
        condition: str = "U",
        guide_type: str = "sold",
    ) -> dict[str, Any]:
        params = {
            "color_id": color_id,
            "guide_type": guide_type,
            "new_or_used": condition,
            "currency_code": self.currency,
        }
        return self._get(f"/items/PART/{part_no}/price", params=params)
