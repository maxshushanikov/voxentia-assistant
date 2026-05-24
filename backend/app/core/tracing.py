"""OpenTelemetry setup for FastAPI and outbound HTTP (Ollama, TTS, Whisper)."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger("voxentia.tracing")

_provider = None
_instrumented = False


def setup_tracing(app: Any | None = None) -> bool:
    """Configure tracer provider and instrument FastAPI + httpx. Returns True if active."""
    global _provider, _instrumented

    if not getattr(settings, "ENABLE_TRACING", True):
        logger.info("OpenTelemetry tracing disabled (ENABLE_TRACING=false)")
        return False

    if _instrumented:
        return True

    try:
        from opentelemetry import trace
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

        service_name = getattr(settings, "OTEL_SERVICE_NAME", "voxentia-backend")
        resource = Resource.create(
            {
                "service.name": service_name,
                "service.version": getattr(settings, "VERSION", "unknown"),
            }
        )
        provider = TracerProvider(resource=resource)

        otlp_endpoint = (getattr(settings, "OTEL_EXPORTER_OTLP_ENDPOINT", None) or "").strip()
        if otlp_endpoint:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

            exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
            provider.add_span_processor(BatchSpanProcessor(exporter))
            logger.info("OTEL traces export to %s", otlp_endpoint)
        elif getattr(settings, "OTEL_CONSOLE_EXPORT", False):
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
            logger.info("OTEL console span export enabled")

        trace.set_tracer_provider(provider)
        _provider = provider

        HTTPXClientInstrumentor().instrument()

        if app is not None:
            FastAPIInstrumentor.instrument_app(
                app,
                excluded_urls="/health,/metrics,/api/v1/health",
            )

        _instrumented = True
        logger.info("OpenTelemetry tracing initialized for %s", service_name)
        return True
    except ImportError as e:
        logger.warning("OpenTelemetry packages missing — tracing disabled: %s", e)
        return False
    except Exception as e:
        logger.exception("Failed to initialize tracing: %s", e)
        return False


def shutdown_tracing() -> None:
    global _provider, _instrumented
    if _provider is not None:
        try:
            _provider.shutdown()
        except Exception as e:
            logger.warning("Tracer shutdown error: %s", e)
    _provider = None
    _instrumented = False


def inject_trace_headers(headers: dict[str, str] | None = None) -> dict[str, str]:
    """Inject W3C tracecontext into outbound request headers."""
    out = dict(headers or {})
    try:
        from opentelemetry.propagate import inject

        inject(out)
    except Exception:
        pass
    return out
