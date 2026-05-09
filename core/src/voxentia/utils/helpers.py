import asyncio
from typing import Any, Coroutine, Optional
import functools
import time

async def with_timeout(coro: Coroutine, timeout_seconds: float = 5.0) -> Any:
    """Führt eine Coroutine mit einem Timeout aus."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        print(f"⌛ Zeitüberschreitung nach {timeout_seconds}s")
        return None

def time_it(func):
    """Decorator zum Messen der Ausführungszeit von (async) Funktionen."""
    @functools.wraps(func)
    async def async_wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = await func(*args, **kwargs)
        end = time.perf_counter()
        print(f"⏱️ {func.__name__} dauerte {end - start:.4f}s")
        return result
    return async_wrapper
