"""Config-derived values reused while walking the nn.Module tree."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

FLOPS_REFERENCE_BATCH = 1
FLOPS_REFERENCE_SEQUENCE = 2048

_DTYPE_BYTES = {
    "float32": 4,
    "float16": 2,
    "bfloat16": 2,
    "float64": 8,
    "int8": 1,
    "uint8": 1,
}


@dataclass(frozen=True, slots=True)
class WalkContext:
    dtype_bytes: int
    hidden_size: int
    vocab_size: int
    num_heads: int
    num_kv_heads: int
    head_dim: int
    intermediate_size: int
    seq_ref: int = FLOPS_REFERENCE_SEQUENCE
    batch_ref: int = FLOPS_REFERENCE_BATCH


def clean_dtype(value: Any) -> str | None:
    if value is None:
        return None
    dtype = str(value)
    if dtype.startswith("torch."):
        dtype = dtype[len("torch.") :]
    return dtype


def dtype_bytes(dtype: str | None) -> int:
    return _DTYPE_BYTES.get(dtype or "", 4)


def walk_context_from_config(config: Any, param_dtype: str | None) -> WalkContext:
    hidden_size = _int_or_default(getattr(config, "hidden_size", None), 0)
    vocab_size = _int_or_default(getattr(config, "vocab_size", None), 0)
    num_heads = _int_or_default(getattr(config, "num_attention_heads", None), 0)
    num_kv_heads = _int_or_default(
        getattr(config, "num_key_value_heads", None),
        num_heads,
    )

    head_dim = _head_dim(config, hidden_size, num_heads)
    intermediate_size = _intermediate_size(config, hidden_size)

    return WalkContext(
        dtype_bytes=dtype_bytes(param_dtype),
        hidden_size=hidden_size,
        vocab_size=vocab_size,
        num_heads=num_heads,
        num_kv_heads=num_kv_heads,
        head_dim=head_dim,
        intermediate_size=intermediate_size,
    )


def _head_dim(config: Any, hidden_size: int, num_heads: int) -> int:
    configured_head_dim = getattr(config, "head_dim", None)
    if configured_head_dim:
        return _int_or_default(configured_head_dim, 0)
    if hidden_size and num_heads:
        return hidden_size // num_heads
    return 0


def _intermediate_size(config: Any, hidden_size: int) -> int:
    configured_size = (
        getattr(config, "intermediate_size", None)
        or getattr(config, "n_inner", None)
        or (4 * hidden_size if hidden_size else 0)
    )
    return _int_or_default(configured_size, 0)


def _int_or_default(value: Any, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default

