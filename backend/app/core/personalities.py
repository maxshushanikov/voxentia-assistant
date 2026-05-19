"""Load personality prompts from external YAML."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Dict

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache
def load_personalities() -> Dict[str, Dict[str, str]]:
    candidates = [
        settings.DATA_DIR / "personalities.yaml",
        settings.REPO_ROOT / "data" / "personalities.yaml",
    ]
    for path in candidates:
        if not path.exists():
            continue
        try:
            import yaml

            data = yaml.safe_load(path.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data:
                logger.info("Loaded personalities from %s", path)
                return data
        except Exception as e:
            logger.warning("Could not load personalities from %s: %s", path, e)
    return dict(settings.PERSONALITIES)
