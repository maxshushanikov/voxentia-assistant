"""SQLite-backed embedding cache — survives restarts, no external dependency."""

from __future__ import annotations

import hashlib
import sqlite3
import struct
import threading
from pathlib import Path


class PersistentEmbeddingCache:
    def __init__(self, cache_path: Path) -> None:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.conn = sqlite3.connect(str(cache_path), check_same_thread=False)
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS embeddings "
            "(key TEXT PRIMARY KEY, vector BLOB, created_at INTEGER)"
        )
        self.conn.commit()

    def get(self, text: str) -> list[float] | None:
        key = hashlib.sha256(text.encode()).hexdigest()
        with self._lock:
            row = self.conn.execute(
                "SELECT vector FROM embeddings WHERE key=?", (key,)
            ).fetchone()
        if not row or not row[0]:
            return None
        blob = row[0]
        n = len(blob) // 4
        return list(struct.unpack(f"{n}f", blob))

    def set(self, text: str, vector: list[float]) -> None:
        if not vector:
            return
        key = hashlib.sha256(text.encode()).hexdigest()
        blob = struct.pack(f"{len(vector)}f", *vector)
        with self._lock:
            self.conn.execute(
                "INSERT OR REPLACE INTO embeddings VALUES (?,?,strftime('%s','now'))",
                (key, blob),
            )
            self.conn.commit()

    def close(self) -> None:
        with self._lock:
            self.conn.close()


_cache_instance: PersistentEmbeddingCache | None = None


def get_embedding_cache(cache_path: Path) -> PersistentEmbeddingCache:
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = PersistentEmbeddingCache(cache_path)
    return _cache_instance
