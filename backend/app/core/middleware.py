import logging
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from voxentia.observability.tracing import get_trace_id

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

logger = logging.getLogger("voxentia.api")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a unique X-Request-ID to every request/response for tracing."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        token = request_id_ctx.set(request_id)
        request.state.request_id = request_id

        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)

        response.headers["X-Request-ID"] = request_id
        trace_id = get_trace_id()
        if trace_id:
            response.headers["X-Trace-ID"] = trace_id
        return response


def get_request_id() -> str:
    return request_id_ctx.get()
