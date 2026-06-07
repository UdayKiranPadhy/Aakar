"""Integration tests for the Hub routes (/api/models).

FastAPI TestClient + a fake `HubService` injected via the Lagom container
(`deps.override_for_test()`). No network. Exercises the full HTTP +
error-handler + query-validation flow.

Note: /api/model-info and /api/model-readme were removed — the frontend
now calls the HuggingFace Hub API directly.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from aakar_api.application import HubService
from aakar_api.di import deps
from aakar_api.domain.hub import HubTrendingItem
from aakar_api.main import app


class FakeHubService(HubService):
    """Bypass client + cache; return canned data or raise."""

    def __init__(
        self,
        *,
        trending: list[HubTrendingItem] | None = None,
    ) -> None:
        self._trending = trending or []

    async def list_trending(self, *, sort: str, limit: int) -> list[HubTrendingItem]:
        return self._trending


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def overrides():
    with deps.override_for_test() as container:
        yield container


def test_models_trending_ok(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(
        trending=[HubTrendingItem(model_id="gpt2"), HubTrendingItem(model_id="bert")]
    )
    r = client.get("/api/models", params={"sort": "trending", "limit": 2})
    assert r.status_code == 200
    assert [m["model_id"] for m in r.json()] == ["gpt2", "bert"]


def test_models_defaults_when_no_query(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(trending=[])
    r = client.get("/api/models")
    assert r.status_code == 200
    assert r.json() == []


def test_models_rejects_bad_sort(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(trending=[])
    r = client.get("/api/models", params={"sort": "bogus"})
    assert r.status_code == 400


@pytest.mark.parametrize("limit", [0, 101])
def test_models_rejects_out_of_range_limit(client: TestClient, overrides, limit: int) -> None:
    overrides[HubService] = FakeHubService(trending=[])
    r = client.get("/api/models", params={"limit": limit})
    assert r.status_code == 400

