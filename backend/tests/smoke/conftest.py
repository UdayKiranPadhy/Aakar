"""Shared fixtures for smoke tests.

Smoke tests run the **real** `TransformersIntrospector` and disk cache against
a `TestClient`, so the entire backend stack from HTTP all the way down to
`accelerate.init_empty_weights` is exercised. Production deps (transformers,
torch, huggingface-hub) are not mocked. Only the cache directory is redirected
to a tmp_path so smoke runs don't pollute the dev cache.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from aakar_api.application import ArchitectureService
from aakar_api.di import deps
from aakar_api.infrastructure import DiskSpecCache, TransformersIntrospector
from aakar_api.main import app


@pytest.fixture
def smoke_client(tmp_path: Path) -> Iterator[TestClient]:
    """`TestClient` wired with the real introspector + a fresh per-test cache."""
    introspector = TransformersIntrospector()
    cache = DiskSpecCache(root=tmp_path)
    service = ArchitectureService(introspector, cache)
    with deps.override_for_test() as container:
        container[ArchitectureService] = service
        with TestClient(app) as client:
            yield client
