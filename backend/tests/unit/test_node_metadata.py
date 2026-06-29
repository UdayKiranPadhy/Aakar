"""Unit tests for the pure helpers in `node_metadata`.

These don't need a real model — they exercise namespace-based category detection
and the role-driven `intermediates` shapes against toy `nn.Module`s. (Role
*classification* itself is tested in `test_role.py`.)
"""

from __future__ import annotations

from dataclasses import replace

from torch import nn

from aakar_api.infrastructure.introspection.node_metadata import (
    category,
    extract_params,
    flops,
    flops_detail,
    intermediates,
    parameter_dtype,
    role_config_facts,
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


# ─── extract_params (generic instance-attribute dump) ───────────────────────


def test_extract_params_dumps_linear_instance_attrs() -> None:
    params = extract_params(nn.Linear(4, 8))
    # Plain instance attributes are surfaced without a curated key list…
    assert params["in_features"] == 4
    assert params["out_features"] == 8
    assert params["has_bias"] is True
    # …but registered parameters (weight/bias tensors) live in `_parameters`, not vars().
    assert "weight" not in params
    assert "bias" not in params


def test_extract_params_dumps_layernorm_attrs_incl_shape_list() -> None:
    params = extract_params(nn.LayerNorm(16))
    assert params["eps"] == 1e-5
    assert params["elementwise_affine"] is True
    assert params["normalized_shape"] == [16]  # tuple → list of ints


def test_extract_params_skips_private_and_non_scalar_attrs() -> None:
    class Custom(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.width = 32  # kept
            self.name = "blk"  # kept
            self._hidden = 99  # skipped (private)
            self.obj = object()  # skipped (not scalar / not int-iterable)

    params = extract_params(Custom())
    assert params == {"width": 32, "name": "blk"}
    assert "training" not in params  # nn.Module's own bool flag is filtered


# ─── parameter_dtype (meta-safe) ────────────────────────────────────────────


def test_parameter_dtype_reads_meta_tensor() -> None:
    linear = nn.Linear(4, 8, device="meta")
    assert parameter_dtype(linear.weight) == "float32"  # torch. prefix stripped
    assert parameter_dtype(linear.bias) == "float32"


def test_parameter_dtype_none_for_missing_or_non_parameter() -> None:
    no_bias = nn.Linear(4, 8, bias=False, device="meta")
    assert no_bias.bias is None
    assert parameter_dtype(no_bias.bias) is None
    assert parameter_dtype(None) is None


# ─── role_config_facts (curated, role-gated) ────────────────────────────────


def test_role_config_facts_attention_gqa() -> None:
    # _ctx() is GQA: num_heads=4, num_kv_heads=2.
    assert role_config_facts(_ctx(), role="attention") == {
        "num_heads": 4,
        "head_dim": 8,
        "num_key_value_heads": 2,
        "gqa_ratio": 2,
    }


def test_role_config_facts_attention_mha_omits_kv_grouping() -> None:
    mha = replace(_ctx(), num_kv_heads=4)  # kv == heads ⇒ plain MHA, no grouping fact
    assert role_config_facts(mha, role="attention") == {"num_heads": 4, "head_dim": 8}


def test_role_config_facts_mlp_width_and_activation() -> None:
    ctx = replace(_ctx(), hidden_act="silu")
    assert role_config_facts(ctx, role="mlp") == {
        "intermediate_size": 256,
        "hidden_act": "silu",
    }


def test_role_config_facts_moe_adds_experts() -> None:
    ctx = replace(_ctx(), hidden_act="silu", num_experts=8, num_experts_per_tok=2)
    assert role_config_facts(ctx, role="moe") == {
        "intermediate_size": 256,
        "hidden_act": "silu",
        "num_experts": 8,
        "num_experts_per_tok": 2,
    }


def test_role_config_facts_empty_for_leaf_roles() -> None:
    for role in ("linear", "norm", "token_embedding", "lm_head", None):
        assert role_config_facts(_ctx(), role=role) == {}


# ─── flops_detail (additive own-forward breakdown) ──────────────────────────
# tokens = seq_ref * batch_ref = 16 * 1 = 16 in _ctx().


def test_flops_detail_linear_matches_headline() -> None:
    linear = nn.Linear(4, 8)
    detail = flops_detail(linear, _ctx(), role="linear")
    assert detail == {"matmul": 2 * 16 * 4 * 8}
    assert detail["matmul"] == flops(linear, _ctx(), role="linear")


def test_flops_detail_norm_matches_headline() -> None:
    norm = nn.LayerNorm(8)
    detail = flops_detail(norm, _ctx(), role="norm")
    assert detail == {"norm": 5 * 16 * 8}
    assert detail["norm"] == flops(norm, _ctx(), role="norm")


def test_flops_detail_attention_two_equal_sdpa_matmuls() -> None:
    detail = flops_detail(nn.Identity(), _ctx(), role="attention")
    assert detail is not None
    per = 2 * 1 * 4 * 16 * 16 * 8  # 2·B·num_heads·S²·head_dim
    assert detail == {"attn_scores": per, "attn_context": per}
    # The SDPA cost is the sum of the two equal matmuls.
    assert detail["attn_scores"] + detail["attn_context"] == 2 * per


def test_flops_detail_attention_none_without_head_facts() -> None:
    assert flops_detail(nn.Identity(), replace(_ctx(), num_heads=0), role="attention") is None


def test_flops_detail_none_for_unhandled() -> None:
    assert flops_detail(nn.Embedding(16, 8), _ctx(), role="token_embedding") is None
    assert flops_detail(nn.Identity(), _ctx(), role=None) is None
