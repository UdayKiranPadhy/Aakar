"""Unit tests for the fact-based role detector.

Every toy module here has a deliberately meaningless class name (`Aa`, `Bb`, …)
so the tests prove the classifier reads *facts* (config dims, tensor shapes,
namespace, structure) and never the class/attribute/child names.
"""

from __future__ import annotations

import torch
from torch import nn

from aakar_api.infrastructure.introspection.role import is_decoder_layer, role
from aakar_api.infrastructure.introspection.walk_context import WalkContext


# GQA context: hidden 16, 4 query heads, 2 kv heads, head_dim 4.
#   qd = 16 (== hidden, so excluded), kvd = 8, fused = {32, 48}, intermediate = 64.
def _ctx() -> WalkContext:
    return WalkContext(
        dtype_bytes=2, hidden_size=16, vocab_size=100,
        num_heads=4, num_kv_heads=2, head_dim=4, intermediate_size=64,
        num_layers=2, num_experts=3, max_position=128,
    )


# MHA context (num_kv == num_heads), qd == hidden — exercises the square-H fallback.
def _ctx_mha() -> WalkContext:
    return WalkContext(
        dtype_bytes=2, hidden_size=16, vocab_size=100,
        num_heads=4, num_kv_heads=4, head_dim=4, intermediate_size=64,
        num_layers=2, num_experts=0, max_position=128,
    )


class Aa(nn.Module):
    """Arbitrary wrapper — children injected per test."""

    def __init__(self, **mods: nn.Module) -> None:
        super().__init__()
        for name, mod in mods.items():
            self.add_module(name, mod)


def _gqa_attention() -> nn.Module:
    return Aa(p1=nn.Linear(16, 16), p2=nn.Linear(16, 8), p3=nn.Linear(16, 8), p4=nn.Linear(16, 16))


def _dense_mlp() -> nn.Module:
    return Aa(a=nn.Linear(16, 64), b=nn.Linear(16, 64), c=nn.Linear(64, 16))


# ─── attention ──────────────────────────────────────────────────────────────

def test_attention_by_gqa_kv_width() -> None:
    # k/v projections at the kv width (8 = num_kv·head_dim) — unique to attention.
    assert role(_gqa_attention(), _ctx()) == "attention"


def test_attention_by_fused_qkv_width() -> None:
    # A single fused projection at num_heads·head_dim + 2·num_kv·head_dim = 32.
    assert role(Aa(fused=nn.Linear(16, 32), out=nn.Linear(16, 16)), _ctx()) == "attention"


def test_attention_square_hidden_fallback_for_mha() -> None:
    # Non-fused MHA where every head width collapses onto H: q/k/v/o are square H×H.
    block = Aa(q=nn.Linear(16, 16), k=nn.Linear(16, 16), v=nn.Linear(16, 16), o=nn.Linear(16, 16))
    assert role(block, _ctx_mha()) == "attention"


def test_attention_beats_mlp_when_it_nests_a_gated_projection() -> None:
    # DeepSeek-style: an attention block whose subtree also holds an intermediate-width
    # projection (64). Attention-first priority must still classify it as attention.
    compressor = Aa(gate=nn.Linear(16, 64))
    block = Aa(q=nn.Linear(16, 16), k=nn.Linear(16, 8), v=nn.Linear(16, 8), comp=compressor)
    assert role(block, _ctx()) == "attention"


# ─── mlp / moe ──────────────────────────────────────────────────────────────

def test_dense_mlp_by_intermediate_width() -> None:
    assert role(_dense_mlp(), _ctx()) == "mlp"


def test_moe_by_fused_expert_parameter() -> None:
    # Fused experts stored as 3-D Parameters (no up_proj child): leading dim == num_experts,
    # and the intermediate width (64) is present → moe.
    class Bb(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.gate_up = nn.Parameter(torch.empty(3, 128, 16))
            self.down = nn.Parameter(torch.empty(3, 16, 64))

    assert role(Aa(experts=Bb()), _ctx()) == "moe"


def test_moe_by_expert_modulelist() -> None:
    experts = nn.ModuleList([_dense_mlp() for _ in range(3)])  # len == num_experts
    assert role(Aa(experts=experts), _ctx()) == "moe"


# ─── norm / embedding / linear ──────────────────────────────────────────────

def test_norm_by_namespace() -> None:
    assert role(nn.LayerNorm(16), _ctx()) == "norm"


def test_norm_by_one_d_weight_leaf() -> None:
    # Model-family RMSNorm: a leaf with a single 1-D affine weight, no torch namespace.
    class Cc(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.weight = nn.Parameter(torch.empty(16))

    assert role(Cc(), _ctx()) == "norm"


def test_token_vs_positional_embedding_by_rows() -> None:
    assert role(nn.Embedding(100, 16), _ctx()) == "token_embedding"      # rows == vocab
    assert role(nn.Embedding(128, 16), _ctx()) == "position_embedding"   # rows == max_position


def test_lm_head_vs_plain_linear_by_vocab_width() -> None:
    assert role(nn.Linear(16, 100), _ctx()) == "lm_head"  # out == vocab
    assert role(nn.Linear(16, 16), _ctx()) == "linear"


# ─── structure: layer stack, decoder layer, wrappers ────────────────────────

def _decoder_layer() -> nn.Module:
    return Aa(attn=_gqa_attention(), mlp=_dense_mlp(), norm=nn.LayerNorm(16))


def test_layer_stack_by_length_and_decoder_children() -> None:
    stack = nn.ModuleList([_decoder_layer() for _ in range(2)])  # len == num_layers
    assert role(stack, _ctx()) == "layer_stack"


def test_expert_modulelist_is_not_a_layer_stack() -> None:
    # A ModuleList of FFNs (len == num_experts != num_layers) is a plain container.
    experts = nn.ModuleList([_dense_mlp() for _ in range(3)])
    assert role(experts, _ctx()) == "container"


def test_decoder_layer_is_detected_and_not_tagged_attention() -> None:
    layer = _decoder_layer()
    assert is_decoder_layer(layer, _ctx()) is True
    # The layer holds attention weights but is not itself an attention block.
    assert role(layer, _ctx()) is None


def test_backbone_wrapper_holding_the_stack_is_not_attention() -> None:
    backbone = Aa(
        embed=nn.Embedding(100, 16),
        layers=nn.ModuleList([_decoder_layer() for _ in range(2)]),
        norm=nn.LayerNorm(16),
    )
    assert role(backbone, _ctx()) is None
