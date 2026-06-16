"""Tests for the per-module forward-operations trace (`fx_operations`).

Like `test_introspector.py`, these load `hf-internal-testing/tiny-random-LlamaForCausalLM`
and run on the meta device — no weights are downloaded beyond the config, and the trace
itself runs under a FakeTensorMode (no real compute).
"""

from __future__ import annotations

import pytest
import torch.nn as nn

from aakar_api.domain.spec import Node
from aakar_api.infrastructure.introspection.fx_operations import trace_operations
from aakar_api.infrastructure.introspection.walk_context import WalkContext
from aakar_api.infrastructure.transformers_introspector import TransformersIntrospector

_TINY_LLAMA = "hf-internal-testing/tiny-random-LlamaForCausalLM"


@pytest.fixture(scope="module")
def introspector() -> TransformersIntrospector:
    return TransformersIntrospector()


def _find(node: Node, path: str) -> Node:
    """Depth-first lookup of a Node by its module_path."""
    if node.module_path == path:
        return node
    for child in node.children or []:
        found = _find_optional(child, path)
        if found is not None:
            return found
    raise AssertionError(f"no node with module_path={path!r}")


def _find_optional(node: Node, path: str) -> Node | None:
    if node.module_path == path:
        return node
    for child in node.children or []:
        found = _find_optional(child, path)
        if found is not None:
            return found
    return None


@pytest.mark.asyncio
async def test_attention_shows_matmul_and_softmax(
    introspector: TransformersIntrospector,
) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    attn = _find(spec.graph[0], "model.layers.0.self_attn")

    assert attn.operations is not None and len(attn.operations) > 5
    ops = [o.op for o in attn.operations]
    cats = {o.category for o in attn.operations}
    # SDPA decomposes to batched matmuls + a softmax — the real attention math.
    assert "bmm" in ops
    assert "matmul" in cats
    assert "activation" in cats  # _safe_softmax


@pytest.mark.asyncio
async def test_decoder_layer_shows_residual_adds(
    introspector: TransformersIntrospector,
) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    layer = _find(spec.graph[0], "model.layers.0")

    assert layer.operations is not None
    add_count = sum(1 for o in layer.operations if o.op == "add")
    # The two residual connections (post-attention and post-MLP) live in the
    # layer's own forward — the submodules' ops live on the submodules.
    assert add_count >= 2
    assert all(o.category == "elementwise" for o in layer.operations)


@pytest.mark.asyncio
async def test_rmsnorm_shows_its_math(introspector: TransformersIntrospector) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    norm = _find(spec.graph[0], "model.layers.0.input_layernorm")

    assert norm.operations is not None
    ops = [o.op for o in norm.operations]
    # RMSNorm = x * rsqrt(mean(x^2) + eps) * weight
    assert "rsqrt" in ops
    assert any(o.category == "norm" for o in norm.operations)


@pytest.mark.asyncio
async def test_leaf_linear_shows_its_matmul(
    introspector: TransformersIntrospector,
) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    q_proj = _find(spec.graph[0], "model.layers.0.self_attn.q_proj")

    assert q_proj.children is None  # it's a leaf
    assert q_proj.operations is not None
    assert any(o.op == "mm" for o in q_proj.operations)
    assert any(o.category == "matmul" for o in q_proj.operations)


@pytest.mark.asyncio
async def test_symbolic_shapes_and_dataflow_inputs(
    introspector: TransformersIntrospector,
) -> None:
    spec = await introspector.introspect(_TINY_LLAMA)
    attn = _find(spec.graph[0], "model.layers.0.self_attn")
    assert attn.operations is not None

    # The sequence dimension is symbolized back to "S".
    assert any("S" in (o.out_shape or "") for o in attn.operations)
    # `inputs` wires ops into a dataflow graph: at least one op consumes another.
    assert any(len(o.inputs) > 0 for o in attn.operations)


@pytest.mark.asyncio
async def test_container_has_no_operations(
    introspector: TransformersIntrospector,
) -> None:
    """A ModuleList has no forward of its own, so no ops are attributed to it."""
    spec = await introspector.introspect(_TINY_LLAMA)
    layers = _find(spec.graph[0], "model.layers")
    assert layers.operations is None


def test_trace_degrades_gracefully_on_untraceable_model() -> None:
    """A model whose forward can't run under the trace yields `{}`, never raises."""
    ctx = WalkContext(
        dtype_bytes=4,
        hidden_size=16,
        vocab_size=32,
        num_heads=4,
        num_kv_heads=4,
        head_dim=4,
        intermediate_size=64,
    )
    # Bare nn.Module.forward raises NotImplementedError when called.
    assert trace_operations(nn.Module(), config=None, ctx=ctx) == {}
