"""Tests for the Redis-backed `RedisSpecCache`.

A tiny in-memory fake stands in for `redis.asyncio.Redis` — no network, no server.
The behaviors that matter: gzip round-trip, the composite key, TTL, and the
fail-open contract (any Redis fault ⇒ miss / no-op, never an exception).
"""

from __future__ import annotations

import gzip

import pytest
from redis.exceptions import RedisError

from aakar_api.domain.spec import Node, Spec
from aakar_api.infrastructure.redis_spec_cache import _DEFAULT_TTL_SECONDS, RedisSpecCache
from aakar_api.infrastructure.spec_cache import _SPEC_SCHEMA_VERSION


def _make_spec(model_id: str = "foo/bar") -> Spec:
    root = Node(
        id="root",
        type="linear",
        label="Linear",
        module_class="Linear",
        param_count=42,
        weight_shape=[2, 2],
    )
    return Spec(
        model_id=model_id,
        model_type="llama",
        config_summary={"hidden_size": 2, "total_params": 42},
        graph=[root],
    )


class FakeRedis:
    """Minimal async stand-in: dict store, records `set` TTLs."""

    def __init__(self) -> None:
        self.store: dict[str, bytes] = {}
        self.set_calls: list[tuple[str, int | None]] = []

    async def get(self, key: str) -> bytes | None:
        return self.store.get(key)

    async def set(self, key: str, value: bytes, ex: int | None = None) -> None:
        self.set_calls.append((key, ex))
        self.store[key] = value

    async def delete(self, *keys: str) -> None:
        for k in keys:
            self.store.pop(k, None)


class BrokenRedis:
    """Every op raises — exercises the fail-open paths."""

    async def get(self, key: str) -> bytes | None:
        raise RedisError("connection refused")

    async def set(self, key: str, value: bytes, ex: int | None = None) -> None:
        raise RedisError("connection refused")

    async def delete(self, *keys: str) -> None:
        raise RedisError("connection refused")


@pytest.mark.asyncio
async def test_set_get_roundtrip() -> None:
    fake = FakeRedis()
    cache = RedisSpecCache(fake)  # type: ignore[arg-type]
    spec = _make_spec()
    await cache.set("foo/bar", "abcdef0123456789", spec)
    got = await cache.get("foo/bar", "abcdef0123456789")
    assert got == spec


@pytest.mark.asyncio
async def test_miss_returns_none() -> None:
    cache = RedisSpecCache(FakeRedis())  # type: ignore[arg-type]
    assert await cache.get("foo/bar", "deadbeefcafe") is None


@pytest.mark.asyncio
async def test_value_is_gzip_compressed() -> None:
    fake = FakeRedis()
    cache = RedisSpecCache(fake)  # type: ignore[arg-type]
    await cache.set("foo/bar", "abcdef0123456789", _make_spec())
    (blob,) = fake.store.values()
    assert blob[:2] == b"\x1f\x8b"  # gzip magic number
    # And it's genuinely the spec JSON underneath.
    assert b'"model_id":"foo/bar"' in gzip.decompress(blob)


@pytest.mark.asyncio
async def test_key_carries_schema_version_and_config_hash() -> None:
    fake = FakeRedis()
    cache = RedisSpecCache(fake)  # type: ignore[arg-type]
    await cache.set("meta-llama/Llama-3-8B", "abc123def456ZZZ", _make_spec())
    (key,) = fake.store.keys()
    assert key == f"aakar:spec:v{_SPEC_SCHEMA_VERSION}:meta-llama__Llama-3-8B:abc123def456"


@pytest.mark.asyncio
async def test_default_ttl_applied_on_set() -> None:
    fake = FakeRedis()
    cache = RedisSpecCache(fake)  # type: ignore[arg-type]
    await cache.set("foo/bar", "abcdef0123456789", _make_spec())
    assert fake.set_calls[0][1] == _DEFAULT_TTL_SECONDS


@pytest.mark.asyncio
async def test_custom_ttl_applied_on_set() -> None:
    fake = FakeRedis()
    cache = RedisSpecCache(fake, ttl_seconds=123)  # type: ignore[arg-type]
    await cache.set("foo/bar", "abcdef0123456789", _make_spec())
    assert fake.set_calls[0][1] == 123


@pytest.mark.asyncio
async def test_get_fails_open_on_redis_error() -> None:
    cache = RedisSpecCache(BrokenRedis())  # type: ignore[arg-type]
    assert await cache.get("foo/bar", "abcdef0123456789") is None


@pytest.mark.asyncio
async def test_set_fails_open_on_redis_error() -> None:
    cache = RedisSpecCache(BrokenRedis())  # type: ignore[arg-type]
    # Must not raise.
    await cache.set("foo/bar", "abcdef0123456789", _make_spec())


@pytest.mark.asyncio
async def test_corrupt_payload_is_treated_as_miss_and_evicted() -> None:
    fake = FakeRedis()
    cache = RedisSpecCache(fake)  # type: ignore[arg-type]
    key = f"aakar:spec:v{_SPEC_SCHEMA_VERSION}:foo__bar:abcdef012345"
    fake.store[key] = b"not gzip, not a spec"
    assert await cache.get("foo/bar", "abcdef0123456789") is None
    # The undecodable entry is dropped so it won't be retried forever.
    assert key not in fake.store
