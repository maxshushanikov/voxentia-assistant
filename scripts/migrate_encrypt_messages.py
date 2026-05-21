#!/usr/bin/env python3
"""One-time migration: encrypt existing chat_messages.content when ENCRYPTION_ENABLED=true.

Backup your database before running:
  cp data/chat.db data/chat.db.bak
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_REPO / "backend"))
sys.path.insert(0, str(_REPO / "core" / "src"))

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal, init_db  # noqa: E402
from app.models.chat import ChatMessage  # noqa: E402
from cryptography.fernet import Fernet  # noqa: E402


def main() -> int:
    if not settings.ENCRYPTION_ENABLED or not settings.ENCRYPTION_KEY:
        print("Set ENCRYPTION_ENABLED=true and ENCRYPTION_KEY in .env first.")
        return 1

    init_db()
    cipher = Fernet(
        settings.ENCRYPTION_KEY.encode()
        if isinstance(settings.ENCRYPTION_KEY, str)
        else settings.ENCRYPTION_KEY
    )
    db = SessionLocal()
    updated = 0
    try:
        for row in db.query(ChatMessage).all():
            try:
                cipher.decrypt(row.content.encode("utf-8"))
                continue
            except Exception:
                pass
            encrypted = cipher.encrypt(row.content.encode("utf-8")).decode("utf-8")
            row.content = encrypted
            updated += 1
        db.commit()
    finally:
        db.close()

    print(f"Encrypted {updated} message(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
