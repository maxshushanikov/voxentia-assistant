"""Background cleanup for old messages and stale audio cache files."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.config import settings
from app.models.chat import ChatMessage
from sqlalchemy.orm import Session

logger = logging.getLogger("voxentia.janitor")


class DatabaseJanitor:
    def __init__(self, retention_days: int = 90) -> None:
        self.retention = timedelta(days=retention_days)

    def _cleanup_messages(self, db: Session) -> int:
        cutoff = datetime.now(timezone.utc) - self.retention
        deleted = (
            db.query(ChatMessage)
            .filter(ChatMessage.timestamp < cutoff)
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted

    def _cleanup_audio_cache(self) -> int:
        cache_dir = Path(settings.AUDIO_CACHE_DIR)
        if not cache_dir.exists():
            return 0
        cutoff_ts = time.time() - self.retention.total_seconds()
        removed = 0
        for path in cache_dir.iterdir():
            if path.is_file() and path.stat().st_mtime < cutoff_ts:
                try:
                    path.unlink()
                    removed += 1
                except OSError as e:
                    logger.warning("Could not delete audio cache %s: %s", path, e)
        return removed

    async def run_once(self, db_factory) -> None:
        db = db_factory()
        try:
            msg_deleted = self._cleanup_messages(db)
            audio_deleted = self._cleanup_audio_cache()
            logger.info(
                "Janitor: deleted %d messages, %d audio files (retention %d days)",
                msg_deleted,
                audio_deleted,
                self.retention.days,
            )
        except Exception as e:
            logger.exception("Janitor run failed: %s", e)
            db.rollback()
        finally:
            db.close()

    async def run_forever(self, db_factory, interval_hours: int = 24) -> None:
        while True:
            await asyncio.sleep(interval_hours * 3600)
            await self.run_once(db_factory)
