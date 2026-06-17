"""Tests for the disk-backed `DiskSpecCache`."""

from __future__ import annotations

from pathlib import Path

import pytest

from aakar_api.domain.spec import Node, Spec
from aakar_api.infrastructure.spec_cache import DiskSpecCache


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
    await cache.set("foo/bar", spec)
    got = await cache.get("foo/bar")
    assert got is not None
    assert got == spec


@pytest.mark.asyncio
async def test_miss_returns_none(tmp_path: Path) -> None:
    cache = DiskSpecCache(root=tmp_path)
    assert await cache.get("foo/bar") is None


@pytest.mark.asyncio
async def test_same_model_id_overwrites_single_entry(tmp_path: Path) -> None:
    # Re-introspecting the same id (e.g. a structure spec, then the operations
    # endpoint's fully-traced one) updates one file in place — the id is the whole key.
    cache = DiskSpecCache(root=tmp_path)
    await cache.set("foo/bar", _make_spec("foo/bar"))
    await cache.set("foo/bar", _make_spec("foo/bar"))
    assert len(list(tmp_path.iterdir())) == 1


@pytest.mark.asyncio
async def test_distinct_model_ids_are_separate_entries(tmp_path: Path) -> None:
    cache = DiskSpecCache(root=tmp_path)
    await cache.set("foo/bar", _make_spec("foo/bar"))
    await cache.set("foo/baz", _make_spec("foo/baz"))
    assert len(list(tmp_path.iterdir())) == 2


@pytest.mark.asyncio
async def test_model_id_with_slash_is_filesystem_safe(tmp_path: Path) -> None:
    cache = DiskSpecCache(root=tmp_path)
    await cache.set("meta-llama/Llama-3-8B", _make_spec("meta-llama/Llama-3-8B"))
    files = [p.name for p in tmp_path.iterdir()]
    assert any("meta-llama__Llama-3-8B" in f for f in files)
