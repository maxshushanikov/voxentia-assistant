import logging

from voxentia.utils.logging import setup_logger


def configure_backend_logging(level: str = "INFO") -> logging.Logger:
    """Configure structured logging for the FastAPI backend."""
    setup_logger("voxentia", level=level)
    setup_logger("voxentia.api", level=level)
    app_logger = setup_logger("app", level=level)
    return app_logger
