"""Tests for the generic-fallback adapter."""

from __future__ import annotations

from aakar_api.adapters import GenericAdapter
from aakar_api.domain.model_config import ModelConfig


def test_generic_supports_no_explicit_types() -> None:
    # The generic adapter is the registry's default, not a registered handler.
    assert GenericAdapter().supported_model_types == ()


def test_generic_emits_single_unknown_node() -> None:
    cfg = ModelConfig(
        raw={"model_type": "phi3", "hidden_size": 3072, "num_hidden_layers": 32, "vocab_size": 32064}
    )
    spec = GenericAdapter().build(cfg, "microsoft/Phi-3-mini")
    assert spec.model_type == "phi3"
    assert len(spec.graph) == 1
    assert spec.graph[0].type == "unknown_architecture"
    assert spec.graph[0].params == {
        "hidden_size": 3072,
        "num_hidden_layers": 32,
        "vocab_size": 32064,
    }


def test_generic_includes_fallback_note() -> None:
    cfg = ModelConfig(raw={"model_type": "phi3"})
    spec = GenericAdapter().build(cfg, "microsoft/Phi-3-mini")
    assert spec.notes is not None
    assert len(spec.notes) == 1
    assert "Generic rendering" in spec.notes[0]
    assert "phi3" in spec.notes[0]


def test_generic_handles_missing_model_type() -> None:
    spec = GenericAdapter().build(ModelConfig(raw={}), "weird/model")
    assert spec.model_type == "unknown"
    assert "unknown" in spec.notes[0]  # type: ignore[index]
