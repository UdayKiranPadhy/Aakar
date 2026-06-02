from __future__ import annotations

from typing import Any

from aakar_api.application.interfaces import HubMetadataCache, HubMetadataClient
from aakar_api.domain.hub import HubModelInfo, HubTrendingItem


class HubService:
    def __init__(self, client: HubMetadataClient, cache: HubMetadataCache) -> None:
        self._client = client
        self._cache = cache

    async def get_model_info(self, model_id: str) -> HubModelInfo:
        cached = await self._cache.get_metadata(model_id)
        if cached is not None:
            return cached
        info = await self._client.get_model_metadata(model_id)
        await self._cache.set_metadata(model_id, info)
        return info

    async def get_readme(self, model_id: str) -> str | None:
        cached = await self._cache.get_readme(model_id)
        if cached is not None:
            return cached
        readme = await self._client.get_readme(model_id)
        # Only cache real cards; a missing README (None) is a cheap re-fetch and
        # caching it would be indistinguishable from a cache miss.
        if readme is not None:
            await self._cache.set_readme(model_id, readme)
        return readme

    async def get_paper(self, arxiv_id: str) -> dict[str, Any] | None:
        return await self._client.get_paper(arxiv_id)

    async def list_trending(self, *, sort: str, limit: int) -> list[HubTrendingItem]:
        key = f"{sort}:{limit}"
        cached = await self._cache.get_trending(key)
        if cached is not None:
            return cached
        items = await self._client.list_trending(sort=sort, limit=limit)
        await self._cache.set_trending(key, items)
        return items
