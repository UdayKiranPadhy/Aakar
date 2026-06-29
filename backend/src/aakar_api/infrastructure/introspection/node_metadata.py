"""Per-module metadata extraction used by the node walker."""

from __future__ import annotations

import inspect
import re
from typing import Any

import torch
import transformers
from torch import nn

from aakar_api.infrastructure.introspection.walk_context import WalkContext, clean_dtype


def parameter_shape(value: Any) -> list[int] | None:
    if isinstance(value, nn.Parameter):
        return list(value.shape)
    return None


def parameter_dtype(value: Any) -> str | None:
    """Actual dtype of a parameter on the meta device (None for non-parameters).

    Meta tensors keep their `.dtype`, so this is faithful without any weights — and it
    can differ from the declared `config.torch_dtype` (mixed precision shows up here)."""
    if isinstance(value, nn.Parameter):
        return clean_dtype(value.dtype)
    return None


def extract_params(module: nn.Module) -> dict[str, Any]:
    """A generic, faithful dump of the module's own scalar instance attributes — every
    public field the class stores, with no curated key list.

    `nn.Module`'s parameters/buffers/submodules live in private `_parameters` / `_buffers`
    / `_modules` dicts (filtered out by the `_` prefix), so this surfaces only the plain
    attributes a class sets in `__init__` — rich for torch built-ins (`Linear.in_features`,
    `LayerNorm.eps`/`normalized_shape`) and older HF modules, sparse for newer ones that
    read from `self.config` at forward time (the config-derived `role_config_facts` fill
    those in). Values are kept only when scalar (`bool/int/float/str`) or an iterable of
    ints (e.g. `normalized_shape`); everything else (tensors, submodules, objects) is
    skipped."""
    params: dict[str, Any] = {}
    for key, value in vars(module).items():
        if key.startswith("_") or key == "training" or callable(value):
            continue
        if isinstance(value, bool | int | float | str):
            params[key] = value
        elif hasattr(value, "__iter__") and not isinstance(value, str | bytes):
            try:
                params[key] = [int(item) for item in value]
            except (TypeError, ValueError):
                continue

    if isinstance(module, nn.Linear):
        params["has_bias"] = module.bias is not None
    return params


def role_config_facts(ctx: WalkContext, *, role: str | None) -> dict[str, Any]:
    """Curated, role-scoped config facts that aren't leaf-module attributes.

    Sourced from the config-resolved `WalkContext` and gated by the fact-based `role`,
    so an attention block surfaces its head grouping and an MLP its width — never a full
    config dump (`config_full` already holds that). Each fact is included only when known;
    `role` strings are the contract from `role.py`, compared as literals to keep the
    dependency one-directional."""
    facts: dict[str, Any] = {}
    if role == "attention":
        if ctx.num_heads:
            facts["num_heads"] = ctx.num_heads
        if ctx.head_dim:
            facts["head_dim"] = ctx.head_dim
        # Only meaningful (and only emitted) when K/V heads are actually shared — i.e. GQA/MQA.
        if ctx.num_kv_heads and ctx.num_heads and ctx.num_kv_heads < ctx.num_heads:
            facts["num_key_value_heads"] = ctx.num_kv_heads
            facts["gqa_ratio"] = ctx.num_heads // ctx.num_kv_heads
    elif role in ("mlp", "moe"):
        if ctx.intermediate_size:
            facts["intermediate_size"] = ctx.intermediate_size
        if ctx.hidden_act:
            facts["hidden_act"] = ctx.hidden_act
        if role == "moe" and ctx.num_experts:
            facts["num_experts"] = ctx.num_experts
            if ctx.num_experts_per_tok:
                facts["num_experts_per_tok"] = ctx.num_experts_per_tok
    return facts


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


def flops_detail(module: nn.Module, ctx: WalkContext, *, role: str | None) -> dict[str, int] | None:
    """Additive FLOPs cost components of this module's OWN forward — companion to `flops`.

    Each key is an exact cost in the same unit, so the values sum to the module's
    own-forward FLOPs. Child modules carry their own breakdown, so nothing here
    double-counts them: an attention block reports only its SDPA softmax-path matmuls,
    not the Q/K/V/O projections (those are child `Linear` nodes). Pure arithmetic on
    config dims + the reference batch/seq — meta-safe, no weights."""
    tokens = ctx.seq_ref * ctx.batch_ref
    if isinstance(module, nn.Linear):
        return {"matmul": 2 * tokens * module.in_features * module.out_features}
    if role == "norm":
        return {"norm": 5 * tokens * ctx.hidden_size}
    if role == "attention":
        if not ctx.num_heads or not ctx.head_dim:
            return None
        # The two batched matmuls of scaled-dot-product attention, each
        # 2·B·num_heads·S²·head_dim: Q·Kᵀ (scores) and scores·V (context). Visible
        # even under attn_impl="sdpa" — SDPA decomposes to bmm → softmax → bmm.
        per_matmul = 2 * ctx.batch_ref * ctx.num_heads * ctx.seq_ref * ctx.seq_ref * ctx.head_dim
        return {"attn_scores": per_matmul, "attn_context": per_matmul}
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



