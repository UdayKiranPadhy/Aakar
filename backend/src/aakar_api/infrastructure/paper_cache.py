"""In-memory TTL cache for resolved paper lists, keyed by model id.

Papers are effectively immutable, so a long TTL (default ~1 day) is fine — this
cache mostly avoids re-resolving arXiv ids + re-hitting the arXiv API on repeat
visits to the same model.
"""

from __future__ import annotations

import os
import time
from collections.abc import Callable

from aakar_api.domain.research import Paper
from aakar_api.infrastructure.ttl_cache import TtlCache

_DEFAULT_PAPER_TTL = float(os.environ.get("PAPER_CACHE_TTL", "86400"))


class InMemoryPaperCache:
    """`PaperCache` implementation backed by a TTL store."""

    def __init__(
        self,
        *,
        ttl: float = _DEFAULT_PAPER_TTL,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._store: TtlCache[list[Paper]] = TtlCache(ttl, clock)

    async def get(self, model_id: str) -> list[Paper] | None:
        return await self._store.get(model_id)

    async def set(self, model_id: str, papers: list[Paper]) -> None:
        await self._store.set(model_id, papers)
