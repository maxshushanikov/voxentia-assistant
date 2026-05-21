"""Docker ASGI entrypoint — loads FastAPI app with explicit path checks."""

from __future__ import annotations

import sys
from pathlib import Path

_APP_ROOT = Path(__file__).resolve().parent
_BACKEND_ROOT = _APP_ROOT / "backend"
_MAIN = _BACKEND_ROOT / "app" / "main.py"


def _ensure_paths() -> None:
    for path in (_APP_ROOT / "core" / "src", _BACKEND_ROOT):
        entry = str(path)
        if entry not in sys.path:
            sys.path.insert(0, entry)


def _validate_layout() -> None:
    if _MAIN.is_file():
        return
    backend_listing = (
        ", ".join(sorted(p.name for p in _BACKEND_ROOT.iterdir()))
        if _BACKEND_ROOT.is_dir()
        else "backend dir missing"
    )
    app_dir = _BACKEND_ROOT / "app"
    app_listing = (
        ", ".join(sorted(p.name for p in app_dir.iterdir()))
        if app_dir.is_dir()
        else "app dir missing or empty (check docker-compose volume mounts)"
    )
    raise RuntimeError(
        f"Missing {_MAIN}. Under {_BACKEND_ROOT}: {backend_listing}. "
        f"Under {app_dir}: {app_listing}. "
        "Rebuild with `docker compose build --no-cache backend` or remove "
        "./backend/app bind mounts unless the host folder contains main.py."
    )


_ensure_paths()
_validate_layout()

from app.main import app  # noqa: E402

__all__ = ["app"]
