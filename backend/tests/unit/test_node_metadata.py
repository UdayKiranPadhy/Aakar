"""Unit tests for the pure helpers in `node_metadata`.

These don't need a real model — they exercise namespace-based category detection
and the role-driven `intermediates` shapes against toy `nn.Module`s. (Role
*classification* itself is tested in `test_role.py`.)
"""

from __future__ import annotations

from torch import nn

from aakar_api.infrastructure.introspection.node_metadata import (
    category,
    intermediates,
    source_url,
)
from aakar_api.infrastructure.introspection.walk_context import WalkContext


def test_category_activation() -> None:
    assert category(nn.SiLU()) == "activation"
    assert category(nn.GELU()) == "activation"
    assert category(nn.ReLU()) == "activation"
    assert category(nn.Tanh()) == "activation"


def test_category_norm() -> None:
    assert category(nn.LayerNorm(8)) == "norm"
    assert category(nn.GroupNorm(2, 8)) == "norm"
    assert category(nn.BatchNorm1d(8)) == "norm"


def test_category_dropout() -> None:
    assert category(nn.Dropout(0.1)) == "dropout"
    assert category(nn.AlphaDropout(0.1)) == "dropout"


def test_category_linear() -> None:
    assert category(nn.Linear(4, 4)) == "linear"
    assert category(nn.Identity()) == "linear"


def test_category_embedding() -> None:
    assert category(nn.Embedding(8, 4)) == "embedding"


def test_category_container() -> None:
    assert category(nn.ModuleList()) == "container"
    assert category(nn.Sequential()) == "container"
    assert category(nn.ModuleDict()) == "container"


def test_category_multihead_attention_excluded() -> None:
    # MultiheadAttention lives in torch.nn.modules.activation but isn't an
    # activation — explicit carve-out.
    assert category(nn.MultiheadAttention(8, 2)) is None


def test_category_unknown_module() -> None:
    class Custom(nn.Module):
        pass

    assert category(Custom()) is None


# ─── Role-driven intermediates ──────────────────────────────────────────────
# `intermediates` no longer inspects the module — it derives the symbolic q/k/v/
# score and up shapes from the config facts on the WalkContext, gated by the
# `role` the detector already assigned. The module argument is irrelevant.


def _ctx() -> WalkContext:
    return WalkContext(
        hidden_size=8,
        vocab_size=16,
        num_heads=4,
        num_kv_heads=2,  # GQA: 2 KV heads
        head_dim=8,
        intermediate_size=256,
        seq_ref=16,
        batch_ref=1,
        dtype_bytes=4,
    )


def test_intermediates_attention_uses_config_facts() -> None:
    out = intermediates(nn.Identity(), _ctx(), role="attention")
    assert out == {
        "q": "[B, 4, S, 8]",
        "k": "[B, 2, S, 8]",  # GQA grouping reflected
        "v": "[B, 2, S, 8]",
        "attn_scores": "[B, 4, S, S]",
    }


def test_intermediates_mlp_returns_up_shape() -> None:
    assert intermediates(nn.Identity(), _ctx(), role="mlp") == {"up": "[B, S, 256]"}
    # MoE exposes the same expansion width.
    assert intermediates(nn.Identity(), _ctx(), role="moe") == {"up": "[B, S, 256]"}


def test_intermediates_none_without_a_matching_role() -> None:
    assert intermediates(nn.Linear(8, 8), _ctx(), role="linear") is None
    assert intermediates(nn.Embedding(16, 8), _ctx(), role="token_embedding") is None
    assert intermediates(nn.LayerNorm(8), _ctx(), role="norm") is None
    assert intermediates(nn.Identity(), _ctx(), role=None) is None


# ─── source_url ─────────────────────────────────────────────────────────────


def test_source_url_for_torch_module() -> None:
    url = source_url(nn.Linear(8, 8))
    assert url is not None
    assert url.startswith("https://github.com/pytorch/pytorch/blob/")
    assert "torch/nn/modules/linear.py" in url
    assert "#L" in url  # line anchor present


def test_source_url_for_transformers_module() -> None:
    # Use any transformers class — the activation wrappers always exist.
    from transformers.activations import GELUActivation

    url = source_url(GELUActivation())
    assert url is not None
    assert url.startswith("https://github.com/huggingface/transformers/blob/")
    assert "src/transformers/activations.py" in url
    assert "#L" in url


def test_source_url_none_for_custom_module() -> None:
    class Custom(nn.Module):
        pass

    # Defined in this test module, not in torch.* or transformers.*.
    assert source_url(Custom()) is None
