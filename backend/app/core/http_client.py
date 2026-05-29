from __future__ import annotations

from typing import Any

import httpx
from app.core.tracing import inject_trace_headers
from voxentia.observability.tracing import trace_span

# Shared AsyncClient with connection pooling for TTS, Whisper, embeddings.
shared_client = httpx.AsyncClient(
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
    timeout=httpx.Timeout(60.0, read=120.0),
)


async def close_shared_client() -> None:
    await shared_client.aclose()


def _merge_headers(headers: dict[str, str] | None) -> dict[str, str]:
    return inject_trace_headers(headers)


async def traced_request(
    service: str,
    method: str,
    url: str,
    *,
    operation: str | None = None,
    **kwargs: Any,
) -> httpx.Response:
    """HTTP call with OTEL span and trace propagation."""
    op = operation or f"{method.upper()} {url}"
    headers = _merge_headers(kwargs.pop("headers", None))
    kwargs["headers"] = headers

    with trace_span(
        f"{service}.{op}",
        service=service,
        attributes={
            "http.method": method.upper(),
            "http.url": url,
            "voxentia.operation": op,
        },
    ) as span:
        response = await shared_client.request(method, url, **kwargs)
        if span is not None:
            span.set_attribute("http.status_code", response.status_code)
        response.raise_for_status()
        return response


async def traced_get(service: str, url: str, **kwargs: Any) -> httpx.Response:
    return await traced_request(service, "GET", url, **kwargs)


async def traced_post(service: str, url: str, **kwargs: Any) -> httpx.Response:
    return await traced_request(service, "POST", url, **kwargs)
