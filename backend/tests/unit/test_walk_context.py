"""Unit tests for config-fact resolution in `walk_context_from_config`."""

from __future__ import annotations

from types import SimpleNamespace

from aakar_api.infrastructure.introspection.walk_context import walk_context_from_config


def _cfg(**overrides: object) -> SimpleNamespace:
    base: dict[str, object] = {
        "hidden_size": 8,
        "vocab_size": 16,
        "num_attention_heads": 4,
        "intermediate_size": 32,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


def test_num_experts_from_num_local_experts() -> None:
    assert walk_context_from_config(_cfg(num_local_experts=8), "float32").num_experts == 8


def test_num_experts_from_n_routed_experts() -> None:
    assert walk_context_from_config(_cfg(n_routed_experts=64), "float32").num_experts == 64


def test_num_experts_from_generic_num_experts_key() -> None:
    # Qwen-MoE families spell it `num_experts` — must be picked up too.
    assert walk_context_from_config(_cfg(num_experts=60), "float32").num_experts == 60


def test_num_experts_zero_when_absent() -> None:
    assert walk_context_from_config(_cfg(), "float32").num_experts == 0


def test_hidden_act_and_experts_per_tok_resolved() -> None:
    ctx = walk_context_from_config(_cfg(hidden_act="silu", num_experts_per_tok=4), "float32")
    assert ctx.hidden_act == "silu"
    assert ctx.num_experts_per_tok == 4
