import logging

from app.core.config import settings
from voxentia.utils.logging import setup_logger


def configure_backend_logging(level: str | None = None) -> logging.Logger:
    lvl = level or settings.LOG_LEVEL
    fmt = settings.LOG_FORMAT
    setup_logger("voxentia", level=lvl, log_format=fmt)
    setup_logger("voxentia.api", level=lvl, log_format=fmt)
    if fmt == "json":
        try:
            import structlog

            structlog.configure(
                processors=[
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.processors.JSONRenderer(),
                ],
                wrapper_class=structlog.make_filtering_bound_logger(
                    getattr(logging, lvl.upper(), logging.INFO)
                ),
            )
        except ImportError:
            logging.getLogger("voxentia").warning(
                "structlog not installed; audit JSON logs use stdlib formatter only"
            )
    return setup_logger("app", level=lvl, log_format=fmt)
