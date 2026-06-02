"""Unit tests for `HubService` cache-aside orchestration.

Uses structural fakes (no inheritance) for the client + cache Protocols — no
network, no httpx.
"""

from __future__ import annotations

from aakar_api.application.hub_service import HubService
from aakar_api.domain.hub import HubModelInfo, HubTrendingItem


class FakeHubClient:
    def __init__(self, readme: str | None = "# Card") -> None:
        self.metadata_calls = 0
        self.readme_calls = 0
        self.trending_calls = 0
        self._readme = readme

    async def get_model_metadata(self, model_id: str) -> HubModelInfo:
        self.metadata_calls += 1
        return HubModelInfo(model_id=model_id, downloads=10)

    async def get_readme(self, model_id: str) -> str | None:
        self.readme_calls += 1
        return self._readme

    async def list_trending(self, *, sort: str, limit: int) -> list[HubTrendingItem]:
        self.trending_calls += 1
        return [HubTrendingItem(model_id=f"{sort}-{limit}")]


class FakeHubCache:
    def __init__(self) -> None:
        self.metadata: dict[str, HubModelInfo] = {}
        self.readme: dict[str, str] = {}
        self.trending: dict[str, list[HubTrendingItem]] = {}

    async def get_metadata(self, model_id: str) -> HubModelInfo | None:
        return self.metadata.get(model_id)

    async def set_metadata(self, model_id: str, info: HubModelInfo) -> None:
        self.metadata[model_id] = info

    async def get_readme(self, model_id: str) -> str | None:
        return self.readme.get(model_id)

    async def set_readme(self, model_id: str, readme: str) -> None:
        self.readme[model_id] = readme

    async def get_trending(self, key: str) -> list[HubTrendingItem] | None:
        return self.trending.get(key)

    async def set_trending(self, key: str, items: list[HubTrendingItem]) -> None:
        self.trending[key] = items


async def test_metadata_is_cached_after_first_fetch() -> None:
    client = FakeHubClient()
    service = HubService(client, FakeHubCache())

    first = await service.get_model_info("gpt2")
    second = await service.get_model_info("gpt2")

    assert first == second
    assert client.metadata_calls == 1  # second call served from cache


async def test_readme_is_cached_when_present() -> None:
    client = FakeHubClient(readme="# Hello")
    service = HubService(client, FakeHubCache())

    await service.get_readme("gpt2")
    await service.get_readme("gpt2")

    assert client.readme_calls == 1


async def test_missing_readme_is_not_cached() -> None:
    # None is indistinguishable from a cache miss, so it must re-fetch.
    client = FakeHubClient(readme=None)
    service = HubService(client, FakeHubCache())

    assert await service.get_readme("gpt2") is None
    assert await service.get_readme("gpt2") is None
    assert client.readme_calls == 2


async def test_trending_keyed_by_sort_and_limit() -> None:
    client = FakeHubClient()
    service = HubService(client, FakeHubCache())

    await service.list_trending(sort="trending", limit=12)
    await service.list_trending(sort="trending", limit=12)  # cache hit
    await service.list_trending(sort="downloads", limit=12)  # different key → miss

    assert client.trending_calls == 2
