"""Tests for the Llama-family adapter against checked-in fixture configs."""

from __future__ import annotations

import pytest

from aakar_api.adapters import LlamaFamilyAdapter
from aakar_api.domain.model_config import ModelConfig


@pytest.fixture
def adapter() -> LlamaFamilyAdapter:
    return LlamaFamilyAdapter()


def test_supports_llama_family(adapter: LlamaFamilyAdapter) -> None:
    assert "llama" in adapter.supported_model_types
    assert "mistral" in adapter.supported_model_types
    assert "qwen2" in adapter.supported_model_types
    assert "qwen3" in adapter.supported_model_types


def test_llama3_8b_graph_shape(adapter: LlamaFamilyAdapter, llama3_8b_config: dict) -> None:
    spec = adapter.build(ModelConfig(raw=llama3_8b_config), "meta-llama/Llama-3-8B")
    # 1 embed + 32 decoder blocks + 1 final_norm + 1 lm_head = 35
    assert len(spec.graph) == 35
    assert spec.graph[0].type == "token_embedding"
    assert spec.graph[1].type == "decoder_block"
    assert spec.graph[-2].type == "rms_norm"
    assert spec.graph[-1].type == "lm_head"


def test_llama3_8b_decoder_internals(
    adapter: LlamaFamilyAdapter, llama3_8b_config: dict
) -> None:
    spec = adapter.build(ModelConfig(raw=llama3_8b_config), "meta-llama/Llama-3-8B")
    block = spec.graph[1]
    assert block.has_internals is True
    assert block.children is not None
    types = [c.type for c in block.children]
    assert types == [
        "rms_norm",
        "self_attention",
        "residual_add",
        "rms_norm",
        "feed_forward",
        "residual_add",
    ]


def test_llama3_8b_attention_internals(
    adapter: LlamaFamilyAdapter, llama3_8b_config: dict
) -> None:
    spec = adapter.build(ModelConfig(raw=llama3_8b_config), "meta-llama/Llama-3-8B")
    block = spec.graph[1]
    assert block.children is not None
    attn = block.children[1]
    assert attn.type == "self_attention"
    assert attn.children is not None
    types = [c.type for c in attn.children]
    assert types == ["linear", "linear", "linear", "sdpa", "linear"]


def test_llama3_8b_total_params_near_8b(
    adapter: LlamaFamilyAdapter, llama3_8b_config: dict
) -> None:
    spec = adapter.build(ModelConfig(raw=llama3_8b_config), "meta-llama/Llama-3-8B")
    total = sum(n.param_count or 0 for n in spec.graph)
    # Llama-3-8B is officially 8.03B; our formula must be within 1%.
    assert 7.9e9 < total < 8.1e9


def test_qwen3_tied_lm_head_zero_params(
    adapter: LlamaFamilyAdapter, qwen3_06b_tied_config: dict
) -> None:
    spec = adapter.build(ModelConfig(raw=qwen3_06b_tied_config), "Qwen/Qwen3-0.6B")
    head = spec.graph[-1]
    assert head.type == "lm_head"
    assert head.param_count == 0
    assert head.params["tied"] is True


def test_mistral_uses_same_adapter(
    adapter: LlamaFamilyAdapter, mistral_7b_config: dict
) -> None:
    spec = adapter.build(ModelConfig(raw=mistral_7b_config), "mistralai/Mistral-7B-v0.1")
    assert spec.model_type == "mistral"
    assert len(spec.graph) == 1 + mistral_7b_config["num_hidden_layers"] + 2


def test_qwen2_7b_graph_layers(adapter: LlamaFamilyAdapter, qwen2_7b_config: dict) -> None:
    spec = adapter.build(ModelConfig(raw=qwen2_7b_config), "Qwen/Qwen2.5-7B")
    # 28 layers + embed + final_norm + lm_head = 31
    assert len(spec.graph) == 31
    assert spec.config_summary["num_key_value_heads"] == 4
