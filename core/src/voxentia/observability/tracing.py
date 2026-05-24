"""Optional OpenTelemetry spans — no-op when OTEL is not configured."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator


def get_trace_id() -> str:
    try:
        from opentelemetry import trace

        ctx = trace.get_current_span().get_span_context()
        if ctx.is_valid:
            return format(ctx.trace_id, "032x")
    except Exception:
        pass
    return ""


@contextmanager
def trace_span(
    name: str,
    *,
    service: str | None = None,
    attributes: dict[str, Any] | None = None,
) -> Iterator[Any]:
    attrs = dict(attributes or {})
    if service:
        attrs.setdefault("peer.service", service)

    try:
        from opentelemetry import trace

        tracer = trace.get_tracer("voxentia")
        with tracer.start_as_current_span(name) as span:
            for key, value in attrs.items():
                if value is not None:
                    span.set_attribute(key, value)
            yield span
    except Exception:
        yield None
