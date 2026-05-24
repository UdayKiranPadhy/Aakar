"""Per-module metadata extraction used by the node walker."""

from __future__ import annotations

from typing import Any

from torch import nn

from aakar_api.infrastructure.introspection.walk_context import WalkContext

_MODULE_PARAM_KEYS = (
    "in_features",
    "out_features",
    "num_embeddings",
    "embedding_dim",
    "normalized_shape",
    "eps",
    "num_heads",
    "head_dim",
    "hidden_size",
    "intermediate_size",
    "p",
)


def parameter_shape(value: Any) -> list[int] | None:
    if isinstance(value, nn.Parameter):
        return list(value.shape)
    return None


def extract_params(module: nn.Module) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for key in _MODULE_PARAM_KEYS:
        value = getattr(module, key, None)
        if value is None or callable(value):
            continue
        if isinstance(value, int | float | bool | str):
            params[key] = value
            continue
        if hasattr(value, "__iter__") and not isinstance(value, str | bytes):
            try:
                params[key] = [int(item) for item in value]
            except (TypeError, ValueError):
                continue

    if isinstance(module, nn.Linear):
        params["has_bias"] = module.bias is not None
    return params


def io_shapes(module: nn.Module, ctx: WalkContext) -> tuple[str | None, str | None]:
    if isinstance(module, nn.Linear):
        return f"[B, S, {module.in_features}]", f"[B, S, {module.out_features}]"
    if isinstance(module, nn.Embedding):
        return "[B, S]", f"[B, S, {module.embedding_dim}]"

    class_name = type(module).__name__
    if _is_norm(module, class_name):
        shape = f"[B, S, {ctx.hidden_size}]"
        return shape, shape
    if isinstance(module, nn.Dropout):
        shape = f"[B, S, {ctx.hidden_size}]"
        return shape, shape
    if _is_hidden_to_hidden_module(class_name):
        shape = f"[B, S, {ctx.hidden_size}]"
        return shape, shape
    if class_name.endswith("ForCausalLM") or class_name.endswith("LMHeadModel"):
        return "[B, S]", f"[B, S, {ctx.vocab_size}]"
    if class_name.endswith("Model") and not class_name.endswith("ForSequenceClassification"):
        return "[B, S]", f"[B, S, {ctx.hidden_size}]"
    return None, None


def buffer_shapes(module: nn.Module) -> dict[str, list[int]]:
    buffers: dict[str, list[int]] = {}
    for name, buffer in module.named_buffers(recurse=False):
        if buffer is not None:
            buffers[name] = list(buffer.shape)
    return buffers


def activation_name(module: nn.Module) -> str | None:
    for attr in ("act_fn", "activation_fn", "activation"):
        activation = getattr(module, attr, None)
        if activation is None:
            continue
        if isinstance(activation, str):
            return activation
        if isinstance(activation, nn.Module):
            return type(activation).__name__
        if callable(activation):
            return type(activation).__name__
    return None


def flops(module: nn.Module, ctx: WalkContext) -> int | None:
    tokens = ctx.seq_ref * ctx.batch_ref
    if isinstance(module, nn.Linear):
        return 2 * tokens * module.in_features * module.out_features
    if isinstance(module, nn.Embedding):
        return 0

    class_name = type(module).__name__
    if _is_norm(module, class_name):
        return 5 * tokens * ctx.hidden_size
    return None


def intermediates(module: nn.Module, ctx: WalkContext) -> dict[str, str] | None:
    class_name = type(module).__name__
    if "Attention" in class_name:
        return _attention_intermediates(module, ctx)
    if any(name in class_name for name in ("MLP", "FeedForward", "FFN")):
        return _mlp_intermediates(module, ctx)
    return None


def _attention_intermediates(module: nn.Module, ctx: WalkContext) -> dict[str, str] | None:
    num_heads = (
        getattr(module, "num_heads", None)
        or getattr(module, "num_attention_heads", None)
        or ctx.num_heads
    )
    num_kv_heads = (
        getattr(module, "num_key_value_heads", None)
        or getattr(module, "num_kv_heads", None)
        or ctx.num_kv_heads
        or num_heads
    )
    head_dim = getattr(module, "head_dim", None) or ctx.head_dim
    if not num_heads or not head_dim:
        return None
    return {
        "q": f"[B, {num_heads}, S, {head_dim}]",
        "k": f"[B, {num_kv_heads}, S, {head_dim}]",
        "v": f"[B, {num_kv_heads}, S, {head_dim}]",
        "attn_scores": f"[B, {num_heads}, S, S]",
    }


def _mlp_intermediates(module: nn.Module, ctx: WalkContext) -> dict[str, str] | None:
    intermediate_size = (
        getattr(module, "intermediate_size", None)
        or getattr(module, "ffn_dim", None)
        or ctx.intermediate_size
    )
    if not intermediate_size:
        return None
    return {"up": f"[B, S, {intermediate_size}]"}


def _is_norm(module: nn.Module, class_name: str) -> bool:
    return isinstance(module, nn.LayerNorm) or "RMSNorm" in class_name or "LayerNorm" in class_name


def _is_hidden_to_hidden_module(class_name: str) -> bool:
    hidden_to_hidden_names = (
        "Attention",
        "MLP",
        "FeedForward",
        "FFN",
        "DecoderLayer",
        "EncoderLayer",
    )
    return any(name in class_name for name in hidden_to_hidden_names)

