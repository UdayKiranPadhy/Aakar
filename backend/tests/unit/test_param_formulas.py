"""Tests for the pure parameter-count formulas."""

from __future__ import annotations

from aakar_api.adapters.building.param_formulas import (
    embedding_params,
    gqa_attention_params,
    linear_params,
    lm_head_params,
    rmsnorm_params,
    swiglu_mlp_params,
)


def test_embedding_params() -> None:
    # Llama-3 vocab × hidden
    assert embedding_params(128_256, 4096) == 525_336_576


def test_linear_no_bias() -> None:
    assert linear_params(4096, 4096) == 16_777_216


def test_linear_with_bias() -> None:
    assert linear_params(4096, 1024, bias=True) == 4096 * 1024 + 1024


def test_gqa_attention_matches_sum_of_parts() -> None:
    # Llama-3 8B per-layer attention
    hidden, head_dim, q_heads, kv_heads = 4096, 128, 32, 8
    expected_q = hidden * (q_heads * head_dim)
    expected_k = hidden * (kv_heads * head_dim)
    expected_v = hidden * (kv_heads * head_dim)
    expected_o = (q_heads * head_dim) * hidden
    expected_total = expected_q + expected_k + expected_v + expected_o
    assert gqa_attention_params(hidden, head_dim, q_heads, kv_heads) == expected_total


def test_gqa_collapses_to_mha_when_heads_equal() -> None:
    # If num_kv_heads == num_attention_heads, GQA == MHA.
    hidden, head_dim, n = 4096, 128, 32
    mha = 4 * hidden * (n * head_dim)  # Q + K + V + O
    assert gqa_attention_params(hidden, head_dim, n, n) == mha


def test_swiglu_mlp_params() -> None:
    # Llama-3 8B per-layer MLP: 3 × 4096 × 14336
    assert swiglu_mlp_params(4096, 14336) == 3 * 4096 * 14336


def test_rmsnorm_params() -> None:
    assert rmsnorm_params(4096) == 4096


def test_lm_head_untied() -> None:
    assert lm_head_params(4096, 128_256, tied=False) == 525_336_576


def test_lm_head_tied_is_zero() -> None:
    assert lm_head_params(4096, 128_256, tied=True) == 0
