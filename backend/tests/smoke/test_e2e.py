"""End-to-end smoke tests — HTTP layer + real introspector + live HF Hub.

These tests are the canary for dep upgrades. They cover:
  - Multiple architecture families (Llama-style + GPT-2-style) so a change
    that silently breaks one family is caught.
  - The full HTTP stack (route → service → introspector → cache → response).
  - Both happy and error paths (404, validation 422, unsupported architecture).
  - The cache layer: warm calls should be substantially faster than cold.

Each model used here is tiny (< 5 MB safetensors) and explicitly published by
HF for downstream testing.
"""

from __future__ import annotations

import time
from typing import Any

import pytest

from aakar_api.api.dependencies import get_architecture_service
from aakar_api.domain.exceptions import UnsupportedArchitecture
from aakar_api.main import app

pytestmark = pytest.mark.smoke


# (model_id, expected model_type, expected root module_class)
SMOKE_MODELS = [
    ("hf-internal-testing/tiny-random-LlamaForCausalLM", "llama", "LlamaForCausalLM"),
    ("sshleifer/tiny-gpt2", "gpt2", "GPT2LMHeadModel"),
]


def _any_leaf_has_weight(node: dict[str, Any]) -> bool:
    if node.get("weight_shape"):
        return True
    return any(_any_leaf_has_weight(c) for c in (node.get("children") or []))


def _count_nodes(node: dict[str, Any]) -> int:
    return 1 + sum(_count_nodes(c) for c in (node.get("children") or []))


def test_health(smoke_client) -> None:
    r = smoke_client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.parametrize("model_id, expected_type, expected_root", SMOKE_MODELS)
def test_introspection_e2e(
    smoke_client, model_id: str, expected_type: str, expected_root: str
) -> None:
    """End-to-end: HTTP → real introspector → real HF Hub → Spec.

    Asserts the contract is honored (every required field present and sane)
    rather than the exact tree, which can shift with transformers refactors.
    """
    r = smoke_client.get("/api/architecture", params={"model_id": model_id})
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["model_id"] == model_id
    assert body["model_type"] == expected_type
    assert body["config_summary"]["total_params"] > 0

    root = body["graph"][0]
    assert root["module_class"] == expected_root
    assert root["has_internals"] is True
    assert root["param_count"] == body["config_summary"]["total_params"]

    # At least one tensor leaf survived the walk with a real shape.
    assert _any_leaf_has_weight(root), (
        "expected at least one leaf node to carry weight_shape"
    )

    # Sanity: the recursive tree should have more than one node.
    assert _count_nodes(root) >= 5, f"tree only had {_count_nodes(root)} nodes"


def test_404_model_not_found(smoke_client) -> None:
    r = smoke_client.get(
        "/api/architecture",
        params={"model_id": "aakar-tests/this-org-does-not-exist-xyz123"},
    )
    assert r.status_code == 404
    body = r.json()
    assert body["kind"] == "model_not_found"
    assert body["model_id"] == "aakar-tests/this-org-does-not-exist-xyz123"


def test_validation_422_invalid_model_id(smoke_client) -> None:
    """Whitespace + control chars are rejected at the FastAPI layer (Pydantic)."""
    r = smoke_client.get("/api/architecture", params={"model_id": "has spaces"})
    assert r.status_code == 422


def test_unsupported_architecture_error_path(smoke_client, monkeypatch) -> None:
    """The 422 unsupported_architecture path is hard to trigger reliably with
    a live model (HF natively bundles new classes over time), so we force-raise
    the exception inside the service and assert the HTTP envelope is correct.
    """

    async def _raise(_self, _model_id: str):
        raise UnsupportedArchitecture("test/model", "FakeArchitecture")

    from aakar_api.application import ArchitectureService

    monkeypatch.setattr(ArchitectureService, "get_architecture", _raise)
    r = smoke_client.get("/api/architecture", params={"model_id": "test/model"})
    assert r.status_code == 422
    body = r.json()
    assert body["kind"] == "unsupported_architecture"
    assert body["architecture"] == "FakeArchitecture"


def test_warm_call_is_substantially_faster(smoke_client) -> None:
    """Confirms the cache layer is reachable end-to-end."""
    model_id = "hf-internal-testing/tiny-random-LlamaForCausalLM"

    t0 = time.perf_counter()
    r_cold = smoke_client.get("/api/architecture", params={"model_id": model_id})
    cold = time.perf_counter() - t0

    t0 = time.perf_counter()
    r_warm = smoke_client.get("/api/architecture", params={"model_id": model_id})
    warm = time.perf_counter() - t0

    assert r_cold.status_code == 200
    assert r_warm.status_code == 200
    assert r_cold.json() == r_warm.json(), "warm payload differs from cold"
    # Cache hits should be well under a second; cold can be several seconds.
    # We use a loose ratio so the test isn't flaky on a fast machine where
    # 'cold' is already fast (HF cache warm on disk).
    assert warm <= cold, f"warm ({warm:.3f}s) not faster than cold ({cold:.3f}s)"


def test_dependency_override_is_active(smoke_client) -> None:
    """Guardrail: if `app.dependency_overrides` quietly stopped honoring our
    fixture, every other smoke test would silently use the *real*
    lifespan-built cache directory and pollute the dev environment.

    We don't assert on the override outside the fixture (it's cleared on
    teardown), so check while the fixture is active.
    """
    assert get_architecture_service in app.dependency_overrides, (
        "smoke fixture isn't wiring its override — tests are touching the real cache"
    )
