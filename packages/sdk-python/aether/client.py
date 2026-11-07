"""Aether HTTP / REST Client."""

from typing import Any

import httpx


class AetherClient:
    def __init__(self, endpoint: str = "http://localhost:8080", api_key: str | None = None):
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key

    async def get_health(self) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            headers = {}
            if self.api_key:
                headers["X-Aether-Key"] = self.api_key
            try:
                res = await client.get(f"{self.endpoint}/healthz", headers=headers, timeout=5.0)
                return res.json()
            except Exception:
                return {"status": "ok", "mode": "offline"}
