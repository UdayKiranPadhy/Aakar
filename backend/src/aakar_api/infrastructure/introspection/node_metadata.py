"""Per-module metadata extraction used by the node walker."""

from __future__ import annotations

import inspect
import re
from typing import Any

import torch
import transformers
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


def io_shapes(
    module: nn.Module,
    ctx: WalkContext,
    *,
    role: str | None,
    decoder_layer: bool,
) -> tuple[str | None, str | None]:
    """I/O tensor shapes, decided from facts (real dims, role, structure) — never class names.

    `role` strings are the contract from `role.py`; compared as literals here to keep the
    dependency one-directional (role.py imports this module's `category`)."""
    if isinstance(module, nn.Linear):
        return f"[B, S, {module.in_features}]", f"[B, S, {module.out_features}]"
    if isinstance(module, nn.Embedding):
        return "[B, S]", f"[B, S, {module.embedding_dim}]"

    hidden = f"[B, S, {ctx.hidden_size}]"
    # Shape-preserving blocks: norms, attention, MLP/MoE, a full decoder layer, dropout.
    shape_preserving = role in ("norm", "attention", "mlp", "moe")
    if shape_preserving or decoder_layer or isinstance(module, nn.Dropout):
        return hidden, hidden
    # Root vs backbone, by structure: a module whose subtree holds the token-embedding table
    # is the language stack. If it also holds a vocab-width projection (its LM head, tied or
    # not) it emits logits; otherwise it's the backbone, emitting hidden states.
    if _subtree_has_embedding(module, ctx.vocab_size):
        if _subtree_has_linear_out(module, ctx.vocab_size):
            return "[B, S]", f"[B, S, {ctx.vocab_size}]"
        return "[B, S]", hidden
    return None, None


def _subtree_has_embedding(module: nn.Module, num_embeddings: int) -> bool:
    return any(
        isinstance(sub, nn.Embedding) and sub.num_embeddings == num_embeddings
        for sub in module.modules()
    )


def _subtree_has_linear_out(module: nn.Module, out_features: int) -> bool:
    return any(
        isinstance(sub, nn.Linear) and sub.out_features == out_features
        for sub in module.modules()
    )


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


def flops(module: nn.Module, ctx: WalkContext, *, role: str | None) -> int | None:
    tokens = ctx.seq_ref * ctx.batch_ref
    if isinstance(module, nn.Linear):
        return 2 * tokens * module.in_features * module.out_features
    if isinstance(module, nn.Embedding):
        return 0
    if role == "norm":
        return 5 * tokens * ctx.hidden_size
    return None


def intermediates(
    module: nn.Module, ctx: WalkContext, *, role: str | None
) -> dict[str, str] | None:
    """Symbolic intermediate tensor shapes, derived from the module's `role` and the config
    facts (head counts, head dim, FFN width) — never from attribute or child names. Attention
    exposes its q/k/v/score shapes; an MLP/MoE its up-projection width."""
    if role == "attention":
        if not ctx.num_heads or not ctx.head_dim:
            return None
        return {
            "q": f"[B, {ctx.num_heads}, S, {ctx.head_dim}]",
            "k": f"[B, {ctx.num_kv_heads}, S, {ctx.head_dim}]",
            "v": f"[B, {ctx.num_kv_heads}, S, {ctx.head_dim}]",
            "attn_scores": f"[B, {ctx.num_heads}, S, S]",
        }
    if role in ("mlp", "moe") and ctx.intermediate_size:
        return {"up": f"[B, S, {ctx.intermediate_size}]"}
    return None


# ─── Source-link construction ───────────────────────────────────────────────
# Why this exists: there is no library-provided schema describing what an
# attention module looks like, so the honest escape valve is to let students
# jump straight to the actual source on GitHub. We support stock
# `transformers.*` and `torch.*` modules; custom code is skipped.

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



