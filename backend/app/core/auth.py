"""Optional API-key / JWT authentication for /api/v1/* routes."""

from __future__ import annotations

from typing import Optional

from app.core.config import settings
from fastapi import HTTPException, Request, Security
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
import secrets

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
_bearer = HTTPBearer(auto_error=False)


def _validate_token(token: str) -> bool:
    # Timing-safe comparison for API key
    if settings.API_KEY:
        try:
            if secrets.compare_digest(str(token), str(settings.API_KEY)):
                return True
        except Exception:
            # Fall through to try JWT if available
            pass

    if settings.JWT_SECRET:
        try:
            import jwt

            decode_kwargs = {
                "key": settings.JWT_SECRET,
                "algorithms": [settings.JWT_ALGORITHM],
                "options": {"require": ["exp"]},
            }
            # If settings define an audience or issuer, verify them
            if getattr(settings, "JWT_AUDIENCE", None):
                decode_kwargs["audience"] = settings.JWT_AUDIENCE
            if getattr(settings, "JWT_ISSUER", None):
                decode_kwargs["issuer"] = settings.JWT_ISSUER

            jwt.decode(token, **decode_kwargs)
            return True
        except Exception:
            return False
    return False


async def require_auth(
    request: Request,
    api_key: Optional[str] = Security(_api_key_header),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(_bearer),
) -> None:
    """FastAPI dependency — skipped when AUTH_ENABLED=false."""
    if not settings.AUTH_ENABLED:
        return

    if api_key and _validate_token(api_key):
        return

    if bearer and _validate_token(bearer.credentials):
        return

    raise HTTPException(
        status_code=401,
        detail={
            "error_code": "unauthorized",
            "message": "Valid API key or bearer token required.",
            "details": {},
        },
    )
