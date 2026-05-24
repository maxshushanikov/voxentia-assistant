"""Metrics and structured logging helpers for production observability."""

from __future__ import annotations

import logging
import time
from typing import Callable

from app.core.config import settings
from app.core.middleware import get_request_id
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("voxentia.api")

_metrics_enabled = getattr(settings, "ENABLE_METRICS", True)
_registry = None
_request_count = None
_request_latency = None


def _init_prometheus():
    global _registry, _request_count, _request_latency
    if _registry is not None:
        return
    try:
        from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

        _registry = True
        _request_count = Counter(
            "voxentia_http_requests_total",
            "Total HTTP requests",
            ["method", "path", "status"],
        )
        _request_latency = Histogram(
            "voxentia_http_request_duration_seconds",
            "HTTP request latency",
            ["method", "path"],
            buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
        )
        globals()["generate_latest"] = generate_latest
        globals()["CONTENT_TYPE_LATEST"] = CONTENT_TYPE_LATEST
    except ImportError:
        _registry = False
        logger.warning("prometheus_client not installed; /metrics disabled")


def metrics_payload() -> tuple[bytes, str] | None:
    if not _metrics_enabled:
        return None
    _init_prometheus()
    if not _registry:
        return None
    from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

    return generate_latest(), CONTENT_TYPE_LATEST


class RequestIdLogFilter(logging.Filter):
    """Inject correlation id from context into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        from voxentia.observability.tracing import get_trace_id

        record.request_id = get_request_id()  # type: ignore[attr-defined]
        trace_id = get_trace_id()
        if trace_id:
            record.trace_id = trace_id  # type: ignore[attr-defined]
        return True


class MetricsMiddleware:
    """ASGI middleware recording request counts and latency."""

    def __init__(self, app: Callable):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not _metrics_enabled:
            await self.app(scope, receive, send)
            return

        _init_prometheus()
        if not _registry:
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        path = scope.get("path", "/")
        start = time.perf_counter()
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 500)
            await send(message)

        await self.app(scope, receive, send_wrapper)
        elapsed = time.perf_counter() - start
        route = path.split("?")[0]
        _request_count.labels(method=method, path=route, status=str(status_code)).inc()
        _request_latency.labels(method=method, path=route).observe(elapsed)
