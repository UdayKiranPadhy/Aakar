"""Tests for `LazyIntrospector` — build the real introspector only on a cache miss.

The point of the lazy wrapper is that a request served from cache must never construct
the (torch-importing) introspector. These tests pin that with a build counter, plus the
service-level guarantee for both the architecture and operations paths.
"""

from __future__ import annotations

import pytest

from aakar_api.application.architecture_service import ArchitectureService
from aakar_api.application.operations_service import OperationsService
from aakar_api.domain.spec import Spec
from aakar_api.infrastructure.lazy_introspector import LazyIntrospector


def _spec(model_id: str = "gpt2", *, traced: bool = False) -> Spec:
    return Spec(
        model_id=model_id,
        model_type="gpt2",
        config_summary={},
        graph=[],
        operations_traced=traced,
    )


class StubIntrospector:
    """Records how many times it's introspected; returns a fixed spec."""

    def __init__(self, spec: Spec) -> None:
        self._spec = spec
        self.calls = 0

    async def introspect(self, model_id: str, *, token: str | None = None) -> Spec:
        self.calls += 1
        return self._spec

    async def introspect_with_operations(
        self, model_id: str, *, token: str | None = None
    ) -> Spec:
        self.calls += 1
        return self._spec


class CountingBuild:
    """A build callable that counts how often it's invoked."""

    def __init__(self, introspector: StubIntrospector) -> None:
        self.introspector = introspector
        self.count = 0

    def __call__(self) -> StubIntrospector:
        self.count += 1
        return self.introspector


class DictCache:
    """In-memory `SpecCache` keyed by model id."""

    def __init__(self, initial: dict[str, Spec] | None = None) -> None:
        self.store = dict(initial or {})

    async def get(self, model_id: str) -> Spec | None:
        return self.store.get(model_id)

    async def set(self, model_id: str, spec: Spec) -> None:
        self.store[model_id] = spec


@pytest.mark.asyncio
async def test_build_is_deferred_until_first_use_and_memoized() -> None:
    build = CountingBuild(StubIntrospector(_spec()))
    lazy = LazyIntrospector(build)
    assert build.count == 0  # merely constructing the wrapper builds nothing

    await lazy.introspect("gpt2")
    assert build.count == 1

    await lazy.introspect_with_operations("gpt2")
    assert build.count == 1  # delegate is memoized — built exactly once


@pytest.mark.asyncio
async def test_architecture_cache_hit_never_builds_the_introspector() -> None:
    stub = StubIntrospector(_spec("gpt2"))
    build = CountingBuild(stub)
    cache = DictCache({"gpt2": _spec("gpt2")})

    service = ArchitectureService(LazyIntrospector(build), cache)
    out = await service.get_architecture("gpt2")

    assert out.model_id == "gpt2"
    assert build.count == 0  # the whole point: a cache hit imports/builds nothing
    assert stub.calls == 0


@pytest.mark.asyncio
async def test_architecture_cache_miss_builds_and_introspects_once() -> None:
    stub = StubIntrospector(_spec("gpt2"))
    build = CountingBuild(stub)

    service = ArchitectureService(LazyIntrospector(build), DictCache())
    await service.get_architecture("gpt2")

    assert build.count == 1
    assert stub.calls == 1


@pytest.mark.asyncio
async def test_operations_cache_hit_with_traced_spec_never_builds() -> None:
    stub = StubIntrospector(_spec("gpt2", traced=True))
    build = CountingBuild(stub)
    cache = DictCache({"gpt2": _spec("gpt2", traced=True)})

    service = OperationsService(LazyIntrospector(build), cache)
    await service.get_operations("gpt2")

    assert build.count == 0
    assert stub.calls == 0
