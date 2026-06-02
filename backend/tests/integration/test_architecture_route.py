"""Integration tests for the /api/architecture route.

Uses FastAPI's TestClient + a fake `ArchitectureService` injected via the Lagom
container (`deps.override_for_test()`). These tests never touch transformers or
the network — the full HTTP + error-handler flow is what we're exercising.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from aakar_api.application import ArchitectureService
from aakar_api.di import deps
from aakar_api.domain.exceptions import (
    IntrospectionFailed,
    IntrospectionTimeout,
    ModelGated,
    ModelNotFound,
    UnsupportedArchitecture,
)
from aakar_api.domain.spec import Node, Spec
from aakar_api.main import app


class FakeArchitectureService(ArchitectureService):
    """Bypass introspector + cache entirely; map model_id → Spec or exception."""

    def __init__(
        self,
        responses: dict[str, Spec] | None = None,
        raises: dict[str, Exception] | None = None,
    ) -> None:
        self._responses = responses or {}
        self._raises = raises or {}

    async def get_architecture(self, model_id: str) -> Spec:
        if model_id in self._raises:
            raise self._raises[model_id]
        if model_id in self._responses:
            return self._responses[model_id]
        raise ModelNotFound(model_id)


def _llama_spec(model_id: str) -> Spec:
    root = Node(
        id="LlamaForCausalLM",
        type="llama_for_causal_lm",
        label="LlamaForCausalLM",
        module_class="LlamaForCausalLM",
        param_count=8_030_261_248,
        has_internals=True,
        children=[
            Node(
                id="lm_head",
                type="linear",
                label="Lm head",
                module_class="Linear",
                weight_shape=[128256, 4096],
                param_count=525_336_576,
            ),
        ],
    )
    return Spec(
        model_id=model_id,
        model_type="llama",
        config_summary={
            "hidden_size": 4096,
            "num_hidden_layers": 32,
            "total_params": 8_030_261_248,
        },
        graph=[root],
    )


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def overrides():
    with deps.override_for_test() as container:
        yield container


def test_health(client: TestClient) -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_architecture_for_llama(client: TestClient, overrides) -> None:
    spec = _llama_spec("meta-llama/Llama-3-8B")
    overrides[ArchitectureService] = FakeArchitectureService(
        responses={"meta-llama/Llama-3-8B": spec}
    )
    r = client.get("/api/architecture", params={"model_id": "meta-llama/Llama-3-8B"})
    assert r.status_code == 200
    body = r.json()
    assert body["model_id"] == "meta-llama/Llama-3-8B"
    assert body["model_type"] == "llama"
    assert body["graph"][0]["module_class"] == "LlamaForCausalLM"
    head = body["graph"][0]["children"][0]
    assert head["module_class"] == "Linear"
    assert head["weight_shape"] == [128256, 4096]


def test_architecture_404(client: TestClient, overrides) -> None:
    overrides[ArchitectureService] = FakeArchitectureService()
    r = client.get("/api/architecture", params={"model_id": "does/not-exist"})
    assert r.status_code == 404
    body = r.json()
    assert body["kind"] == "model_not_found"
    assert body["model_id"] == "does/not-exist"


def test_architecture_403_gated(client: TestClient, overrides) -> None:
    overrides[ArchitectureService] = FakeArchitectureService(
        raises={"private/model": ModelGated("private/model")}
    )
    r = client.get("/api/architecture", params={"model_id": "private/model"})
    assert r.status_code == 403
    body = r.json()
    assert body["kind"] == "model_gated"
    assert body["model_id"] == "private/model"


def test_architecture_422_unsupported_architecture(client: TestClient, overrides) -> None:
    overrides[ArchitectureService] = FakeArchitectureService(
        raises={"custom/model": UnsupportedArchitecture("custom/model", "DeepSeekV3")}
    )
    r = client.get("/api/architecture", params={"model_id": "custom/model"})
    assert r.status_code == 422
    body = r.json()
    assert body["kind"] == "unsupported_architecture"
    assert body["architecture"] == "DeepSeekV3"


def test_architecture_500_on_unexpected_error_is_cors_friendly(overrides) -> None:
    # An unexpected (non-domain) exception must surface as a JSON 500 that still
    # carries CORS headers, so the browser delivers it to JS (not a "failed to
    # fetch" network error). raise_server_exceptions=False to capture the 500.
    overrides[ArchitectureService] = FakeArchitectureService(
        raises={"org/boom": RuntimeError("kaboom")}
    )
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get(
            "/api/architecture",
            params={"model_id": "org/boom"},
            headers={"Origin": "http://localhost:5173"},
        )
    assert r.status_code == 500
    body = r.json()
    assert body["kind"] == "server_error"
    # The CORS header is the whole point of the fix — without it the browser
    # hides the 500 from JS.
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_architecture_rejects_bad_model_id(client: TestClient, overrides) -> None:
    overrides[ArchitectureService] = FakeArchitectureService()
    r = client.get("/api/architecture", params={"model_id": "has spaces"})
    # Request-validation is remapped to 400 so 422 stays exclusive to
    # unsupported_architecture (the frontend routes purely on status).
    assert r.status_code == 400
    body = r.json()
    assert body["kind"] == "bad_request"


def test_architecture_502_introspection_failed(client: TestClient, overrides) -> None:
    # Sandboxed build of a remote-code model tried and failed.
    overrides[ArchitectureService] = FakeArchitectureService(
        raises={"org/custom": IntrospectionFailed("org/custom", "meta build failed")}
    )
    r = client.get("/api/architecture", params={"model_id": "org/custom"})
    assert r.status_code == 502
    body = r.json()
    assert body["kind"] == "introspection_failed"
    assert body["model_id"] == "org/custom"


def test_architecture_504_introspection_timeout(client: TestClient, overrides) -> None:
    overrides[ArchitectureService] = FakeArchitectureService(
        raises={"org/slow": IntrospectionTimeout("org/slow", timeout_s=90.0)}
    )
    r = client.get("/api/architecture", params={"model_id": "org/slow"})
    assert r.status_code == 504
    body = r.json()
    assert body["kind"] == "introspection_timeout"
    assert body["model_id"] == "org/slow"
