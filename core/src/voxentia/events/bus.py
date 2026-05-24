"""Lightweight event bus — Redis Streams when configured, in-process fallback."""

from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any, Callable, Coroutine

logger = logging.getLogger("voxentia.events")

EventHandler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class EventBus:
    def __init__(self, redis_url: str | None = None, stream_key: str = "voxentia:events") -> None:
        self._redis_url = (redis_url or "").strip() or None
        self._stream_key = stream_key
        self._local_handlers: dict[str, list[EventHandler]] = defaultdict(list)
        self._redis = None

    async def _redis_client(self):
        if self._redis is not None:
            return self._redis
        if not self._redis_url:
            return None
        try:
            import redis.asyncio as redis

            self._redis = redis.from_url(self._redis_url, decode_responses=True)
            return self._redis
        except Exception as e:
            logger.warning("Redis event bus unavailable: %s", e)
            return None

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        self._local_handlers[event_type].append(handler)

    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        event = {"type": event_type, "payload": payload}
        client = await self._redis_client()
        if client:
            try:
                await client.xadd(
                    self._stream_key,
                    {"data": json.dumps(event, ensure_ascii=False)},
                    maxlen=10_000,
                    approximate=True,
                )
            except Exception as e:
                logger.warning("Redis XADD failed, falling back to local: %s", e)

        for handler in self._local_handlers.get(event_type, []):
            try:
                await handler(payload)
            except Exception as e:
                logger.exception("Event handler error for %s: %s", event_type, e)

    async def ensure_connected(self) -> bool:
        """Verify Redis connectivity when configured."""
        if not self._redis_url:
            return False
        client = await self._redis_client()
        if not client:
            return False
        try:
            await client.ping()
            return True
        except Exception as e:
            logger.warning("Redis ping failed: %s", e)
            return False

    def is_enabled(self) -> bool:
        return bool(self._redis_url)

    async def close(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None


def create_event_bus(redis_url: str | None, enabled: bool) -> EventBus:
    if not enabled:
        return EventBus(redis_url=None)
    url = (redis_url or "").strip() or None
    if not url:
        logger.warning("ENABLE_EVENT_BUS=true but REDIS_URL is empty — using in-process handlers only")
    return EventBus(redis_url=url)
