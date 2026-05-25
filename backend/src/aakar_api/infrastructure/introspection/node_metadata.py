"""Per-module metadata extraction used by the node walker."""

from __future__ import annotations

import inspect
import re
from typing import Any

import torch
import transformers
from torch import nn

from aakar_api.infrastructure.introspection._naming import (
    ATTENTION_HEAD_ATTRS,
    ATTENTION_HEAD_DIM_ATTRS,
    ATTENTION_KV_HEAD_ATTRS,
    ATTENTION_PROJECTION_NAMES,
    MLP_PROJECTION_NAMES,
    MLP_SIZE_ATTRS,
)
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


_NAMESPACE_CATEGORIES: tuple[tuple[str, str], ...] = (
    ("torch.nn.modules.normalization", "norm"),
    ("torch.nn.modules.batchnorm", "norm"),
    ("torch.nn.modules.dropout", "dropout"),
    ("torch.nn.modules.linear", "linear"),
    ("torch.nn.modules.sparse", "embedding"),
    ("torch.nn.modules.container", "container"),
)


def category(module: nn.Module) -> str | None:
    """Classify a module by the Python module its class is defined in.

    Activations also pick up Hugging Face's `transformers.activations.*` wrappers, which is the only
    namespace outside `torch.nn` worth tagging — every other transformer
    submodule lives in a model-family-specific file with no shared namespace.
    """
    defined_in = type(module).__module__
    if defined_in.startswith("torch.nn.modules.activation"):
        # MultiheadAttention lives in this namespace but is not an activation.
        if type(module).__name__ != "MultiheadAttention":
            return "activation"
    if defined_in.startswith("transformers.activations"):
        return "activation"
    for namespace, tag in _NAMESPACE_CATEGORIES:
        if defined_in.startswith(namespace):
            return tag
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
    """Per-class intermediate tensor shapes not visible from in/out alone.
    We fingerprint by either (a) the presence
    of module-config attributes like `num_heads` / `intermediate_size`, or
    (b) the names of projection submodules (`q_proj`, `gate_proj`, …) — both
    constrained by HF's state-dict naming convention. See `_naming.py`.
    """
    if _looks_like_attention(module):
        return _attention_intermediates(module, ctx)
    if _looks_like_mlp(module):
        return _mlp_intermediates(module, ctx)
    return None


def _looks_like_attention(module: nn.Module) -> bool:
    if _first_attr(module, ATTENTION_HEAD_ATTRS):
        return True
    return _has_any_child(module, ATTENTION_PROJECTION_NAMES)


def _looks_like_mlp(module: nn.Module) -> bool:
    if _first_attr(module, MLP_SIZE_ATTRS):
        return True
    return _has_any_child(module, MLP_PROJECTION_NAMES)


def _attention_intermediates(module: nn.Module, ctx: WalkContext) -> dict[str, str] | None:
    num_heads = _first_attr(module, ATTENTION_HEAD_ATTRS) or ctx.num_heads
    num_kv_heads = (
        _first_attr(module, ATTENTION_KV_HEAD_ATTRS) or ctx.num_kv_heads or num_heads
    )
    head_dim = _first_attr(module, ATTENTION_HEAD_DIM_ATTRS) or ctx.head_dim
    if not num_heads or not head_dim:
        return None
    return {
        "q": f"[B, {num_heads}, S, {head_dim}]",
        "k": f"[B, {num_kv_heads}, S, {head_dim}]",
        "v": f"[B, {num_kv_heads}, S, {head_dim}]",
        "attn_scores": f"[B, {num_heads}, S, S]",
    }


def _mlp_intermediates(module: nn.Module, ctx: WalkContext) -> dict[str, str] | None:
    intermediate_size = _first_attr(module, MLP_SIZE_ATTRS) or ctx.intermediate_size
    if not intermediate_size:
        return None
    return {"up": f"[B, S, {intermediate_size}]"}


def _first_attr(module: nn.Module, names: tuple[str, ...]) -> Any:
    """Return the first truthy attribute matching one of `names`."""
    for name in names:
        value = getattr(module, name, None)
        if value:
            return value
    return None


def _has_any_child(module: nn.Module, names: frozenset[str]) -> bool:
    return any(name in names for name, _ in module.named_children())


# ─── Source-link construction ───────────────────────────────────────────────
# Why this exists: there is no library-provided schema describing what an
# attention module looks like (see _naming.py). The honest escape valve is
# to let students jump straight to the actual source on GitHub. We support
# stock `transformers.*` and `torch.*` modules; custom code is skipped.

_SOURCE_REPOS: tuple[tuple[str, str, str, str], ...] = (
    # (package prefix, GitHub owner/repo, in-repo source root, version string)
    ("transformers", "huggingface/transformers", "src/", transformers.__version__),
    ("torch", "pytorch/pytorch", "", torch.__version__),
)

_SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")


def source_url(module: nn.Module) -> str | None:
    """Best-effort GitHub link to the module's class definition.

    Returns None for modules we don't recognise (custom user code, or any
    package outside `transformers.*` / `torch.*`). Pins the URL to the
    installed package's release tag when it looks like a clean semver;
    otherwise falls back to `main` (the URL stays valid; line number may
    drift).
    """
    cls = type(module)
    module_path = cls.__module__
    for prefix, repo, src_root, version in _SOURCE_REPOS:
        if module_path == prefix or module_path.startswith(prefix + "."):
            ref = f"v{version}" if _SEMVER_RE.match(version) else "main"
            file_path = src_root + module_path.replace(".", "/") + ".py"
            anchor = _line_anchor(cls)
            return f"https://github.com/{repo}/blob/{ref}/{file_path}{anchor}"
    return None


def _line_anchor(cls: type) -> str:
    try:
        _, line = inspect.getsourcelines(cls)
    except (OSError, TypeError):
        return ""
    return f"#L{line}"


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

