"""Integration tests for the Hub routes (/api/model-info, /model-readme, /models).

FastAPI TestClient + a fake `HubService` injected via the Lagom container
(`deps.override_for_test()`). No network. Exercises the full HTTP +
error-handler + query-validation flow.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from aakar_api.application import HubService
from aakar_api.di import deps
from aakar_api.domain.exceptions import HubUnavailable, ModelNotFound
from aakar_api.domain.hub import HubModelInfo, HubTrendingItem
from aakar_api.main import app


class FakeHubService(HubService):
    """Bypass client + cache; return canned data or raise."""

    def __init__(
        self,
        *,
        info: HubModelInfo | None = None,
        readme: str | None = None,
        trending: list[HubTrendingItem] | None = None,
        raises: dict[str, Exception] | None = None,
    ) -> None:
        self._info = info
        self._readme = readme
        self._trending = trending or []
        self._raises = raises or {}

    async def get_model_info(self, model_id: str) -> HubModelInfo:
        if model_id in self._raises:
            raise self._raises[model_id]
        if self._info is not None:
            return self._info
        raise ModelNotFound(model_id)

    async def get_readme(self, model_id: str) -> str | None:
        if model_id in self._raises:
            raise self._raises[model_id]
        return self._readme

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


def test_model_info_ok(client: TestClient, overrides) -> None:
    info = HubModelInfo(model_id="gpt2", downloads=1000, likes=5, tags=["pytorch"])
    overrides[HubService] = FakeHubService(info=info)
    r = client.get("/api/model-info", params={"model_id": "gpt2"})
    assert r.status_code == 200
    body = r.json()
    assert body["model_id"] == "gpt2"  # snake_case out, not "id"
    assert body["downloads"] == 1000


def test_model_info_404(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(raises={"ghost/model": ModelNotFound("ghost/model")})
    r = client.get("/api/model-info", params={"model_id": "ghost/model"})
    assert r.status_code == 404
    assert r.json()["kind"] == "model_not_found"


def test_model_info_503_when_hub_down(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(raises={"gpt2": HubUnavailable("gpt2")})
    r = client.get("/api/model-info", params={"model_id": "gpt2"})
    assert r.status_code == 503
    body = r.json()
    assert body["kind"] == "hub_unavailable"
    assert body["model_id"] == "gpt2"


def test_model_readme_ok(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(readme="# GPT-2")
    r = client.get("/api/model-readme", params={"model_id": "gpt2"})
    assert r.status_code == 200
    assert r.json() == {"model_id": "gpt2", "readme": "# GPT-2"}


def test_model_readme_null_when_no_card(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(readme=None)
    r = client.get("/api/model-readme", params={"model_id": "gpt2"})
    assert r.status_code == 200
    assert r.json() == {"model_id": "gpt2", "readme": None}


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


def test_model_info_rejects_bad_model_id(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(info=HubModelInfo(model_id="x"))
    r = client.get("/api/model-info", params={"model_id": "has spaces"})
    assert r.status_code == 400
