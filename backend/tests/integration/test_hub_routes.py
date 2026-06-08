"""Integration tests for the Hub routes (/api/models, /api/model-info, /api/model-readme).

FastAPI TestClient + a fake `HubService` injected via the Lagom container
(`deps.override_for_test()`). No network. Exercises the full HTTP +
error-handler + query-validation flow.

`/api/model-info` and `/api/model-readme` proxy the public HuggingFace Hub so
the browser isn't subject to the Hub's missing CORS headers (the Hub sends no
`Access-Control-Allow-Origin` on these endpoints).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from aakar_api.application import HubService
from aakar_api.di import deps
from aakar_api.domain.exceptions import ModelGated, ModelNotFound
from aakar_api.domain.hub import HubModelInfo, HubTrendingItem
from aakar_api.main import app


class FakeHubService(HubService):
    """Bypass client + cache; return canned data or raise."""

    def __init__(
        self,
        *,
        trending: list[HubTrendingItem] | None = None,
        model_info: HubModelInfo | None = None,
        readme: str | None = None,
        error: Exception | None = None,
    ) -> None:
        self._trending = trending or []
        self._model_info = model_info
        self._readme = readme
        self._error = error

    async def list_trending(self, *, sort: str, limit: int) -> list[HubTrendingItem]:
        return self._trending

    async def get_model_info(self, model_id: str) -> HubModelInfo:
        if self._error is not None:
            raise self._error
        assert self._model_info is not None
        return self._model_info

    async def get_readme(self, model_id: str) -> str | None:
        if self._error is not None:
            raise self._error
        return self._readme


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def overrides():
    with deps.override_for_test() as container:
        yield container


# ── /api/models (trending) ───────────────────────────────────────────────────


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


# ── /api/model-info ──────────────────────────────────────────────────────────


def test_model_info_ok_serializes_snake_case(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(
        model_info=HubModelInfo(
            model_id="gpt2",
            downloads=5,
            likes=2,
            tags=["text-generation"],
            created_at="2022-03-02T23:29:04.000Z",
            used_storage=11977009063,
            spaces=["owner/space"],
            config={"model_type": "gpt2"},
        )
    )
    r = client.get("/api/model-info", params={"model_id": "gpt2"})
    assert r.status_code == 200
    body = r.json()
    # The wire contract is snake_case (camelCase aliases are validation-only).
    assert body["model_id"] == "gpt2"
    assert body["created_at"] == "2022-03-02T23:29:04.000Z"
    assert body["used_storage"] == 11977009063
    assert body["spaces"] == ["owner/space"]
    assert body["config"]["model_type"] == "gpt2"


def test_model_info_not_found(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(error=ModelNotFound("ghost/model"))
    r = client.get("/api/model-info", params={"model_id": "ghost/model"})
    assert r.status_code == 404
    assert r.json()["kind"] == "model_not_found"


def test_model_info_gated(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(error=ModelGated("meta-llama/Llama-3-8B"))
    r = client.get("/api/model-info", params={"model_id": "meta-llama/Llama-3-8B"})
    assert r.status_code == 403
    assert r.json()["kind"] == "model_gated"


def test_model_info_rejects_bad_id(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(model_info=HubModelInfo(model_id="x"))
    r = client.get("/api/model-info", params={"model_id": "bad id!"})
    assert r.status_code == 400


# ── /api/model-readme ────────────────────────────────────────────────────────


def test_model_readme_ok(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(readme="# Hello\n\nmodel card body")
    r = client.get("/api/model-readme", params={"model_id": "gpt2"})
    assert r.status_code == 200
    assert "# Hello" in r.text
    assert r.headers["content-type"].startswith("text/markdown")


def test_model_readme_absent_is_204(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(readme=None)
    r = client.get("/api/model-readme", params={"model_id": "gpt2"})
    assert r.status_code == 204
    assert r.text == ""


def test_model_readme_not_found(client: TestClient, overrides) -> None:
    overrides[HubService] = FakeHubService(error=ModelNotFound("ghost/model"))
    r = client.get("/api/model-readme", params={"model_id": "ghost/model"})
    assert r.status_code == 404
