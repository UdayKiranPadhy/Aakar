"""Tests for the in-memory TTL `InMemoryHubCache` — time injected, no sleeping."""

from __future__ import annotations

from aakar_api.domain.hub import HubModelInfo, HubTrendingItem
from aakar_api.infrastructure.hub_cache import InMemoryHubCache


class _Clock:
    def __init__(self) -> None:
        self.t = 0.0

    def __call__(self) -> float:
        return self.t


async def test_metadata_hit_before_ttl_then_miss_after() -> None:
    clock = _Clock()
    cache = InMemoryHubCache(metadata_ttl=100.0, clock=clock)
    info = HubModelInfo(model_id="gpt2")

    await cache.set_metadata("gpt2", info)
    assert await cache.get_metadata("gpt2") == info  # t=0, fresh

    clock.t = 99.0
    assert await cache.get_metadata("gpt2") == info  # still within TTL

    clock.t = 100.0
    assert await cache.get_metadata("gpt2") is None  # expired


async def test_trending_uses_its_own_ttl() -> None:
    clock = _Clock()
    cache = InMemoryHubCache(metadata_ttl=10.0, trending_ttl=1000.0, clock=clock)
    items = [HubTrendingItem(model_id="gpt2")]

    await cache.set_trending("trending:12", items)
    clock.t = 500.0
    assert await cache.get_trending("trending:12") == items  # metadata TTL irrelevant


async def test_unknown_key_is_a_miss() -> None:
    cache = InMemoryHubCache()
    assert await cache.get_metadata("never/set") is None
    assert await cache.get_trending("nope") is None
