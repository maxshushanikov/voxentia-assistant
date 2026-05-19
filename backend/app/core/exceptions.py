import logging

from app.core.errors import VoxentiaError
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("voxentia.api")


def _structured(
    error_code: str,
    message: str,
    details: dict | None = None,
    *,
    legacy_code: str | None = None,
) -> dict:
    payload = {
        "error_code": error_code,
        "message": message,
        "details": details or {},
    }
    if legacy_code:
        payload["code"] = legacy_code
        payload["detail"] = message
    return payload


async def voxentia_error_handler(request: Request, exc: VoxentiaError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_structured(exc.error_code, exc.message, exc.details, legacy_code=exc.error_code),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "error_code" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    message = detail if isinstance(detail, str) else str(detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=_structured("http_error", message, legacy_code="http_error"),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=_structured(
            "validation_error",
            "Invalid request.",
            {"errors": exc.errors()},
            legacy_code="validation_error",
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "-")
    logger.exception(
        "Unhandled error on %s %s [request_id=%s]",
        request.method,
        request.url.path,
        request_id,
    )
    return JSONResponse(
        status_code=500,
        content=_structured(
            "internal_error",
            "An internal error occurred.",
            legacy_code="internal_error",
        ),
    )
