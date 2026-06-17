"""Tests for `TieredSpecCache` — primary-first reads, write-through, backfill."""

from __future__ import annotations

import pytest

from aakar_api.domain.spec import Node, Spec
from aakar_api.infrastructure.tiered_spec_cache import TieredSpecCache


def _make_spec(model_id: str = "foo/bar") -> Spec:
    root = Node(id="root", type="linear", label="Linear", module_class="Linear")
    return Spec(
        model_id=model_id,
        model_type="llama",
        config_summary={"total_params": 42},
        graph=[root],
    )


class MemCache:
    """In-memory `SpecCache` that records its calls."""

    def __init__(self) -> None:
        self.store: dict[str, Spec] = {}
        self.gets: list[str] = []
        self.sets: list[str] = []

    async def get(self, model_id: str) -> Spec | None:
        self.gets.append(model_id)
        return self.store.get(model_id)

    async def set(self, model_id: str, spec: Spec) -> None:
        self.sets.append(model_id)
        self.store[model_id] = spec


@pytest.mark.asyncio
async def test_primary_hit_skips_secondary() -> None:
    primary, secondary = MemCache(), MemCache()
    spec = _make_spec()
    await primary.set("foo/bar", spec)

    cache = TieredSpecCache(primary, secondary)
    got = await cache.get("foo/bar")

    assert got == spec
    assert secondary.gets == []  # secondary never consulted on a primary hit


@pytest.mark.asyncio
async def test_secondary_hit_backfills_primary() -> None:
    primary, secondary = MemCache(), MemCache()
    spec = _make_spec()
    await secondary.set("foo/bar", spec)

    cache = TieredSpecCache(primary, secondary)
    got = await cache.get("foo/bar")

    assert got == spec
    # The fast tier is warmed so the next read stays local.
    assert "foo/bar" in primary.store


@pytest.mark.asyncio
async def test_miss_consults_both_and_returns_none() -> None:
    primary, secondary = MemCache(), MemCache()
    cache = TieredSpecCache(primary, secondary)

    assert await cache.get("foo/bar") is None
    assert primary.gets == ["foo/bar"]
    assert secondary.gets == ["foo/bar"]


@pytest.mark.asyncio
async def test_set_writes_through_to_both() -> None:
    primary, secondary = MemCache(), MemCache()
    cache = TieredSpecCache(primary, secondary)

    await cache.set("foo/bar", _make_spec())

    assert "foo/bar" in primary.store
    assert "foo/bar" in secondary.store
