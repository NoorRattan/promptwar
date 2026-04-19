"""Best-effort Upstash Redis cache helpers over HTTP."""

import json
import logging
from urllib.parse import quote

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


def _cache_enabled() -> bool:
    return bool(settings.REDIS_URL and settings.REDIS_TOKEN)


async def _get_client() -> httpx.AsyncClient | None:
    global _client
    if not _cache_enabled():
        return None
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {settings.REDIS_TOKEN}"},
            timeout=2.0,
        )
    return _client


async def get(key: str) -> str | None:
    """Return a cached string value or `None` on any failure."""
    try:
        client = await _get_client()
        if client is None:
            return None
        response = await client.get(f"{settings.REDIS_URL}/get/{quote(key, safe='')}")
        response.raise_for_status()
        return response.json().get("result")
    except Exception as exc:
        logger.warning("Redis GET failed for %s: %s", key, exc)
        return None


async def set(key: str, value: str, ttl_seconds: int) -> bool:
    """Store a cached string value and return `False` on any failure."""
    try:
        client = await _get_client()
        if client is None:
            return False
        encoded_key = quote(key, safe="")
        encoded_value = quote(value, safe="")
        response = await client.post(
            f"{settings.REDIS_URL}/set/{encoded_key}/{encoded_value}",
            params={"EX": ttl_seconds},
        )
        response.raise_for_status()
        return True
    except Exception as exc:
        logger.warning("Redis SET failed for %s: %s", key, exc)
        return False


async def delete(key: str) -> bool:
    """Delete a cache key if possible."""
    try:
        client = await _get_client()
        if client is None:
            return False
        response = await client.get(f"{settings.REDIS_URL}/del/{quote(key, safe='')}")
        response.raise_for_status()
        return True
    except Exception as exc:
        logger.warning("Redis DEL failed for %s: %s", key, exc)
        return False


async def get_json(key: str) -> dict[str, object] | list[object] | None:
    """Return a JSON-decoded cache entry or `None`."""
    raw_value = await get(key)
    if raw_value is None:
        return None
    try:
        return json.loads(raw_value)
    except Exception as exc:
        logger.warning("Redis JSON decode failed for %s: %s", key, exc)
        return None


async def set_json(
    key: str,
    value: dict[str, object] | list[object],
    ttl_seconds: int,
) -> bool:
    """JSON-encode and cache a structured payload."""
    try:
        return await set(key, json.dumps(value, default=str), ttl_seconds)
    except Exception as exc:
        logger.warning("Redis JSON encode failed for %s: %s", key, exc)
        return False


def density_key(venue_id: str) -> str:
    return f"crowdiq:{venue_id}:density"


def queues_key(venue_id: str) -> str:
    return f"crowdiq:{venue_id}:queues"


def venue_key(venue_id: str) -> str:
    return f"crowdiq:{venue_id}:venue"


def menu_key(venue_id: str) -> str:
    return f"crowdiq:menu:{venue_id}"


async def close() -> None:
    """Close the shared HTTP client during shutdown."""
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None
