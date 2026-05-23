"""Tests for the disk-backed `DiskSpecCache`."""

from __future__ import annotations

from pathlib import Path

import pytest

from aakar_api.domain.spec import Node, Spec
from aakar_api.infrastructure.spec_cache import DiskSpecCache, hash_config


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


@pytest.mark.asyncio
async def test_set_get_roundtrip(tmp_path: Path) -> None:
    cache = DiskSpecCache(root=tmp_path)
    spec = _make_spec()
    await cache.set("foo/bar", "abcdef0123456789", spec)
    got = await cache.get("foo/bar", "abcdef0123456789")
    assert got is not None
    assert got == spec


@pytest.mark.asyncio
async def test_miss_returns_none(tmp_path: Path) -> None:
    cache = DiskSpecCache(root=tmp_path)
    assert await cache.get("foo/bar", "deadbeefcafe") is None


@pytest.mark.asyncio
async def test_different_hash_is_separate_entry(tmp_path: Path) -> None:
    cache = DiskSpecCache(root=tmp_path)
    spec_a = _make_spec("foo/bar")
    spec_b = _make_spec("foo/bar")
    await cache.set("foo/bar", "1111111111ab", spec_a)
    await cache.set("foo/bar", "2222222222cd", spec_b)
    # Two distinct files written, both retrievable
    files = list(tmp_path.iterdir())
    assert len(files) == 2


@pytest.mark.asyncio
async def test_model_id_with_slash_is_filesystem_safe(tmp_path: Path) -> None:
    cache = DiskSpecCache(root=tmp_path)
    await cache.set("meta-llama/Llama-3-8B", "abc123def456", _make_spec("meta-llama/Llama-3-8B"))
    files = [p.name for p in tmp_path.iterdir()]
    assert any("meta-llama__Llama-3-8B" in f for f in files)


def test_hash_config_is_canonical() -> None:
    a = {"hidden_size": 4, "num_heads": 2}
    b = {"num_heads": 2, "hidden_size": 4}  # different insertion order
    assert hash_config(a) == hash_config(b)


def test_hash_config_changes_with_content() -> None:
    a = {"hidden_size": 4}
    b = {"hidden_size": 5}
    assert hash_config(a) != hash_config(b)
