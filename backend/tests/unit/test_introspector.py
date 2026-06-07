"""Integration-flavored unit tests for `TransformersIntrospector`.

These tests load `hf-internal-testing/tiny-random-LlamaForCausalLM` (a ~1 MB
test model HF publishes for exactly this purpose). The introspection runs on
the meta device — no weights are downloaded beyond the config.

If the HF Hub is unreachable, the tests will fail; that's acceptable here
because the introspector's whole job is to talk to it.
"""

from __future__ import annotations

import pytest
import torch.nn as nn

from aakar_api.domain.exceptions import ModelNotFound, UnsupportedArchitecture
from aakar_api.infrastructure.transformers_introspector import (
    TransformersIntrospector,
    _humanize,
    _snake_case,
    _WalkCtx,
)

_TINY_LLAMA = "hf-internal-testing/tiny-random-LlamaForCausalLM"


@pytest.fixture(scope="module")
def introspector() -> TransformersIntrospector:
    return TransformersIntrospector()


def test_snake_case() -> None:
    assert _snake_case("LlamaSdpaAttention") == "llama_sdpa_attention"
    assert _snake_case("Linear") == "linear"
    assert _snake_case("LlamaRMSNorm") == "llama_rms_norm"


def test_humanize() -> None:
    assert _humanize("q_proj") == "Q proj"
    assert _humanize("0") == "Layer 0"
    assert _humanize("embed_tokens") == "Embed tokens"


@pytest.mark.asyncio
async def test_tiny_llama_full_tree(introspector: TransformersIntrospector) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    assert spec.model_id == _TINY_LLAMA
    assert spec.model_type == "llama"
    assert spec.config_summary["total_params"] > 0

    root = spec.graph[0]
    assert root.module_class == "LlamaForCausalLM"
    assert root.has_internals
    # Root has two children: the backbone + lm_head
    child_paths = {c.id for c in root.children or []}
    assert child_paths == {"model", "lm_head"}


@pytest.mark.asyncio
async def test_self_attention_projections(introspector: TransformersIntrospector) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    model = next(c for c in spec.graph[0].children or [] if c.id == "model")
    layers = next(c for c in model.children or [] if c.id == "model.layers")
    layer0 = (layers.children or [])[0]
    assert layer0.module_class == "LlamaDecoderLayer"

    attn = next(c for c in layer0.children or [] if "self_attn" in c.id)
    proj_ids = {c.id for c in attn.children or []}
    # Llama-family always has q/k/v/o + a rotary embedding submodule.
    for name in ("q_proj", "k_proj", "v_proj", "o_proj"):
        assert any(p.endswith(f".{name}") for p in proj_ids), name

    q = next(c for c in attn.children or [] if c.id.endswith(".q_proj"))
    assert q.module_class == "Linear"
    assert q.weight_shape is not None
    assert len(q.weight_shape) == 2  # [out_features, in_features]
    assert q.bias_shape is None  # Llama-3 disables bias on attention projections


@pytest.mark.asyncio
async def test_lm_head_shape(introspector: TransformersIntrospector) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    lm_head = next(c for c in spec.graph[0].children or [] if c.id == "lm_head")
    assert lm_head.module_class == "Linear"
    # weight is [vocab_size, hidden_size]; both are non-zero.
    assert lm_head.weight_shape is not None
    assert lm_head.weight_shape[0] == spec.config_summary["vocab_size"]
    assert lm_head.weight_shape[1] == spec.config_summary["hidden_size"]


@pytest.mark.asyncio
async def test_param_count_is_recursive(introspector: TransformersIntrospector) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    root = spec.graph[0]
    children_sum = sum((c.param_count or 0) for c in root.children or [])
    assert root.param_count == children_sum == spec.config_summary["total_params"]


@pytest.mark.asyncio
async def test_spec_level_metadata(introspector: TransformersIntrospector) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    # Every spec-level field that the frontend's ModelInfoStrip relies on.
    assert spec.param_dtype is not None
    assert spec.attn_impl in {"eager", "sdpa", "flash_attention_2"}
    assert spec.position_encoding == "rope"  # Llama uses RoPE
    assert spec.tied_word_embeddings is not None
    assert spec.flops_reference == {"batch_size": 1, "seq_len": 2048}
    # GQA ratio is derived from heads / kv heads — tiny-random-llama uses MHA.
    assert spec.config_summary.get("gqa_ratio") == 1


@pytest.mark.asyncio
async def test_symbolic_io_shapes(introspector: TransformersIntrospector) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    hidden = spec.config_summary["hidden_size"]
    vocab = spec.config_summary["vocab_size"]

    root = spec.graph[0]
    # CausalLM root: tokens in, logits out.
    assert root.input_shape == "[B, S]"
    assert root.output_shape == f"[B, S, {vocab}]"

    lm_head = next(c for c in root.children or [] if c.id == "lm_head")
    assert lm_head.input_shape == f"[B, S, {hidden}]"
    assert lm_head.output_shape == f"[B, S, {vocab}]"

    model = next(c for c in root.children or [] if c.id == "model")
    embed = next(c for c in model.children or [] if c.id == "model.embed_tokens")
    assert embed.input_shape == "[B, S]"
    assert embed.output_shape == f"[B, S, {hidden}]"


@pytest.mark.asyncio
async def test_memory_and_flops(introspector: TransformersIntrospector) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    hidden = spec.config_summary["hidden_size"]
    vocab = spec.config_summary["vocab_size"]

    lm_head = next(c for c in spec.graph[0].children or [] if c.id == "lm_head")
    # Linear FLOPs at S=2048: 2 * S * in * out
    expected_flops = 2 * 2048 * hidden * vocab
    assert lm_head.flops == expected_flops
    # tiny-random-llama is fp32 on meta → 4 bytes per param.
    assert lm_head.memory_bytes == (lm_head.param_count or 0) * 4


@pytest.mark.asyncio
async def test_categories_on_real_llama_tree(
    introspector: TransformersIntrospector,
) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    model = next(c for c in spec.graph[0].children or [] if c.id == "model")
    layers = next(c for c in model.children or [] if c.id == "model.layers")
    layer0 = (layers.children or [])[0]

    # Activation: SiLU/Swish lives as an `act_fn` child of the gated MLP.
    mlp = next(c for c in layer0.children or [] if c.id.endswith(".mlp"))
    act = next(c for c in mlp.children or [] if c.id.endswith(".act_fn"))
    assert act.category == "activation"
    assert act.module_class is not None
    assert "SiLU" in act.module_class or "Silu" in act.module_class

    # Embedding: backbone has `embed_tokens` as a top-level child.
    embed = next(c for c in model.children or [] if c.id == "model.embed_tokens")
    assert embed.category == "embedding"

    # Linear: the LM head is a top-level `nn.Linear` projection.
    lm_head = next(c for c in spec.graph[0].children or [] if c.id == "lm_head")
    assert lm_head.category == "linear"

    # Container: `model.layers` is an `nn.ModuleList`.
    assert layers.category == "container"

    # Norm: Llama's `*RMSNorm` lives in the model file, not torch.nn —
    # namespace-only detection deliberately leaves it untagged.
    norm = next(c for c in layer0.children or [] if c.id.endswith(".input_layernorm"))
    assert norm.category is None


@pytest.mark.asyncio
async def test_intermediates_on_attention_and_mlp(
    introspector: TransformersIntrospector,
) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    model = next(c for c in spec.graph[0].children or [] if c.id == "model")
    layers = next(c for c in model.children or [] if c.id == "model.layers")
    layer0 = (layers.children or [])[0]

    attn = next(c for c in layer0.children or [] if c.id.endswith(".self_attn"))
    assert attn.intermediates is not None
    # Multi-head reshape — Q/K/V shapes encode num_heads, GQA grouping, head_dim.
    for key in ("q", "k", "v", "attn_scores"):
        assert key in attn.intermediates
    # The attention map carries the S² term.
    assert ", S, S]" in attn.intermediates["attn_scores"]

    mlp = next(c for c in layer0.children or [] if c.id.endswith(".mlp"))
    assert mlp.intermediates is not None
    assert "up" in mlp.intermediates
    # The expansion target is intermediate_size, not hidden_size.
    expected = spec.config_summary.get("intermediate_size")
    assert expected is not None
    assert str(expected) in mlp.intermediates["up"]


def test_intermediates_use_config_kv_heads_for_gqa() -> None:
    """Grouped-query attention has fewer K/V heads than Q heads. The q/k/v/score shapes are
    derived from the config facts (carried on the WalkContext), gated by the module's role."""
    ctx = _WalkCtx(
        dtype_bytes=2,
        hidden_size=1024,
        vocab_size=151936,
        num_heads=16,
        num_kv_heads=8,
        head_dim=128,
        intermediate_size=3072,
        seq_ref=2048,
        batch_ref=1,
    )

    out = TransformersIntrospector._intermediates(nn.Module(), ctx, role="attention")
    assert out is not None
    assert out["q"] == "[B, 16, S, 128]"
    assert out["k"] == "[B, 8, S, 128]"
    assert out["v"] == "[B, 8, S, 128]"
    assert out["attn_scores"] == "[B, 16, S, S]"


@pytest.mark.asyncio
async def test_intermediates_absent_on_leaf_modules(
    introspector: TransformersIntrospector,
) -> None:
    """Linear / Embedding / norms shouldn't carry intermediates."""
    spec = await introspector.introspect(_TINY_LLAMA)
    lm_head = next(c for c in spec.graph[0].children or [] if c.id == "lm_head")
    assert lm_head.intermediates is None


@pytest.mark.asyncio
async def test_buffers_on_rotary(introspector: TransformersIntrospector) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    model = next(c for c in spec.graph[0].children or [] if c.id == "model")
    rotary = next(
        (c for c in model.children or [] if "rotary" in (c.module_class or "").lower()),
        None,
    )
    assert rotary is not None, "Expected a rotary embedding submodule on LlamaModel"
    # The rotary embedding caches the inverse-frequency table as a buffer.
    assert rotary.buffers is not None
    assert "inv_freq" in rotary.buffers


@pytest.mark.asyncio
async def test_fetch_config_hash_is_stable(introspector: TransformersIntrospector) -> None:
    h1 = await introspector.fetch_config_hash(_TINY_LLAMA)
    h2 = await introspector.fetch_config_hash(_TINY_LLAMA)
    assert h1 == h2
    assert len(h1) == 64  # sha256 hex


@pytest.mark.asyncio
async def test_model_not_found(introspector: TransformersIntrospector) -> None:
    with pytest.raises(ModelNotFound):
        await introspector.introspect("aakar-tests/this-model-does-not-exist-xyz")


@pytest.mark.asyncio
async def test_unsupported_architecture(monkeypatch: pytest.MonkeyPatch) -> None:
    """If config.architectures resolves to a class not in transformers, raise."""

    class FakeConfig:
        architectures = ["NotARealArchitectureClass"]
        model_type = "fake"

        def to_dict(self) -> dict:
            return {}

    introspector = TransformersIntrospector()

    def _load_fake(_model_id: str, _token: str | None = None) -> FakeConfig:
        return FakeConfig()

    monkeypatch.setattr(TransformersIntrospector, "_load_config", staticmethod(_load_fake))

    with pytest.raises(UnsupportedArchitecture) as exc_info:
        await introspector.introspect("fake/model")
    assert exc_info.value.architecture == "NotARealArchitectureClass"
