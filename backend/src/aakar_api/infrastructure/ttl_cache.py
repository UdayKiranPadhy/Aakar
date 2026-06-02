"""A tiny async-safe, time-expiring cache — shared by the Hub and paper caches.

Time-based expiry (not content-hash like `DiskSpecCache`) is the right model for
external metadata that drifts with no content key to detect change. `clock` is
injectable so tests can advance time without sleeping.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Callable
from typing import Generic, TypeVar

_T = TypeVar("_T")


class TtlCache(Generic[_T]):
    """Key→value store whose entries expire `ttl` seconds after being set."""

    def __init__(self, ttl: float, clock: Callable[[], float] = time.monotonic) -> None:
        self._ttl = ttl
        self._clock = clock
        self._data: dict[str, tuple[float, _T]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> _T | None:
        async with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            expiry, value = entry
            if self._clock() >= expiry:
                del self._data[key]
                return None
            return value

    async def set(self, key: str, value: _T) -> None:
        async with self._lock:
            self._data[key] = (self._clock() + self._ttl, value)
