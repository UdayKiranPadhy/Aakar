"""In-memory TTL cache for Hub metadata.

Unlike `DiskSpecCache` (keyed by a content hash, so entries never go stale), Hub
data — downloads, likes, trending order — drifts continuously with no content
key to detect change. A time-based expiry is the right model. In-memory (not
disk) because the data is small and cheap to refetch; persisting it across
restarts has negative value when staleness tolerance is low.
"""

from __future__ import annotations

import os
import time
from collections.abc import Callable

from aakar_api.domain.hub import HubModelInfo, HubTrendingItem
from aakar_api.infrastructure.ttl_cache import TtlCache

_DEFAULT_METADATA_TTL = float(os.environ.get("HUB_CACHE_TTL", "300"))
_DEFAULT_TRENDING_TTL = float(os.environ.get("HUB_TRENDING_TTL", "900"))


class InMemoryHubCache:
    """`HubMetadataCache` implementation backed by TTL stores.

    `clock` is injectable so tests can advance time without sleeping.
    """

    def __init__(
        self,
        *,
        metadata_ttl: float = _DEFAULT_METADATA_TTL,
        trending_ttl: float = _DEFAULT_TRENDING_TTL,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._metadata: TtlCache[HubModelInfo] = TtlCache(metadata_ttl, clock)
        self._readme: TtlCache[str] = TtlCache(metadata_ttl, clock)
        self._trending: TtlCache[list[HubTrendingItem]] = TtlCache(trending_ttl, clock)

    async def get_metadata(self, model_id: str) -> HubModelInfo | None:
        return await self._metadata.get(model_id)

    async def set_metadata(self, model_id: str, info: HubModelInfo) -> None:
        await self._metadata.set(model_id, info)

    async def get_readme(self, model_id: str) -> str | None:
        return await self._readme.get(model_id)

    async def set_readme(self, model_id: str, readme: str) -> None:
        await self._readme.set(model_id, readme)

    async def get_trending(self, key: str) -> list[HubTrendingItem] | None:
        return await self._trending.get(key)

    async def set_trending(self, key: str, items: list[HubTrendingItem]) -> None:
        await self._trending.set(key, items)
