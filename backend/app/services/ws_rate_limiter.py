from __future__ import annotations

import time
from collections import defaultdict


class InMemoryWSRateLimiter:
    def __init__(self) -> None:
        self._records = defaultdict(list)

    def allow(self, client_id: str, *, max_requests: int = 20, period_seconds: int = 60) -> bool:
        now = time.time()
        timestamps = [t for t in self._records[client_id] if now - t < period_seconds]
        self._records[client_id] = timestamps
        if len(timestamps) >= max_requests:
            return False
        self._records[client_id].append(now)
        return True
