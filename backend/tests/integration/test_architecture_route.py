"""Integration tests for the /api/architecture route.

Uses FastAPI's TestClient + dependency_overrides to inject a FakeConfigRepository,
so these tests never touch the network. The full request → service → adapter →
response flow is exercised.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from aakar_api.api.dependencies import get_config_repository
from aakar_api.application import ConfigRepository
from aakar_api.domain.exceptions import (
    ConfigFetchTimeout,
    ModelGated,
    ModelNotFound,
)
from aakar_api.domain.model_config import ModelConfig
from aakar_api.main import app

_FIXTURES = Path(__file__).parent.parent / "fixtures"


class FakeConfigRepository(ConfigRepository):
    """In-memory repo. Maps model IDs to fixture file names; raises on misses."""

    def __init__(self, mapping: dict[str, str], gated: set[str] | None = None) -> None:
        self._mapping = mapping
        self._gated = gated or set()

    async def fetch(self, model_id: str) -> ModelConfig:
        if model_id in self._gated:
            raise ModelGated(model_id)
        if model_id not in self._mapping:
            raise ModelNotFound(model_id)
        with (_FIXTURES / f"{self._mapping[model_id]}.json").open() as fp:
            return ModelConfig(raw=json.load(fp))


class TimeoutRepo(ConfigRepository):
    async def fetch(self, model_id: str) -> ModelConfig:
        raise ConfigFetchTimeout(model_id)


@pytest.fixture
def client():
    # Context-manager form triggers FastAPI's lifespan, which sets up
    # app.state.http_client. Without it, any dependency that reaches
    # get_http_client (even transitively via validation paths) blows up.
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_overrides():
    yield
    app.dependency_overrides.clear()


def _use_repo(repo: ConfigRepository) -> None:
    app.dependency_overrides[get_config_repository] = lambda: repo


def test_health(client: TestClient) -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_adapters_lists_registered_types(client: TestClient) -> None:
    r = client.get("/api/adapters")
    assert r.status_code == 200
    body = r.json()
    assert set(body["registered"]) == {"llama", "mistral", "qwen2", "qwen3"}
    assert body["default"] == "GenericAdapter"


def test_architecture_for_llama(client: TestClient) -> None:
    _use_repo(FakeConfigRepository({"meta-llama/Llama-3-8B": "llama3_8b"}))
    r = client.get("/api/architecture", params={"model_id": "meta-llama/Llama-3-8B"})
    assert r.status_code == 200
    assert r.headers["cache-control"] == "public, max-age=86400"
    body = r.json()
    assert body["model_id"] == "meta-llama/Llama-3-8B"
    assert body["model_type"] == "llama"
    assert len(body["graph"]) == 35


def test_architecture_for_qwen3_tied(client: TestClient) -> None:
    _use_repo(FakeConfigRepository({"Qwen/Qwen3-0.6B": "qwen3_06b_tied"}))
    r = client.get("/api/architecture", params={"model_id": "Qwen/Qwen3-0.6B"})
    assert r.status_code == 200
    body = r.json()
    head = body["graph"][-1]
    assert head["type"] == "lm_head"
    assert head["params"]["tied"] is True
    assert head["param_count"] == 0


def test_architecture_404(client: TestClient) -> None:
    _use_repo(FakeConfigRepository({}))
    r = client.get("/api/architecture", params={"model_id": "does/not-exist"})
    assert r.status_code == 404
    assert r.json()["error"] == "model_not_found"


def test_architecture_403_gated(client: TestClient) -> None:
    _use_repo(FakeConfigRepository({}, gated={"private/model"}))
    r = client.get("/api/architecture", params={"model_id": "private/model"})
    assert r.status_code == 403
    assert r.json()["error"] == "model_gated"


def test_architecture_504_timeout(client: TestClient) -> None:
    _use_repo(TimeoutRepo())
    r = client.get("/api/architecture", params={"model_id": "slow/model"})
    assert r.status_code == 504
    assert r.json()["error"] == "upstream_timeout"


def test_architecture_rejects_bad_model_id(client: TestClient) -> None:
    r = client.get("/api/architecture", params={"model_id": "has spaces"})
    assert r.status_code == 422  # FastAPI/Pydantic validation


def test_architecture_generic_fallback(client: TestClient) -> None:
    # phi3 isn't supported; expect generic rendering + a note.
    fixtures = _FIXTURES.parent / "fixtures"
    (fixtures / "phi3_stub.json").write_text(
        json.dumps({"model_type": "phi3", "hidden_size": 3072, "num_hidden_layers": 32})
    )
    try:
        _use_repo(FakeConfigRepository({"microsoft/Phi-3": "phi3_stub"}))
        r = client.get("/api/architecture", params={"model_id": "microsoft/Phi-3"})
        assert r.status_code == 200
        body = r.json()
        assert body["model_type"] == "phi3"
        assert len(body["graph"]) == 1
        assert body["graph"][0]["type"] == "unknown_architecture"
        assert body["notes"] is not None
        assert "Generic rendering" in body["notes"][0]
    finally:
        (fixtures / "phi3_stub.json").unlink(missing_ok=True)
