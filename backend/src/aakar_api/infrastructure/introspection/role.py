"""Fact-based semantic role for an nn.Module — *what a module is*, proven, never guessed.

The earlier approach matched class names (`"Attention" in type(m).__name__`), attribute
names (`m.intermediate_size`), and state-dict child names (`q_proj`, `gate_proj`). All three
are *guesses*: a model that spells things differently (MiniMax names its expert width
`intermediate_dim`; its experts are fused `nn.Parameter`s with no `up_proj` child) slips
through, and a model that nests a gated projection inside attention (DeepSeek's
`HCACompressor.gate_proj`) gets misread as an MLP.

This module decides a role from signals that are **true by construction**:

  * the **config** — head counts, kv-head counts, head dim, intermediate width, expert
    count, layer count, vocab — already resolved into `WalkContext` (the single fact source);
  * the **real tensor shapes** of a module's parameters (Linear, Conv1D, fused 3-D experts);
  * the namespace **category** (which torch/transformers namespace the class is defined in);
  * the **structure** (a ModuleList whose length is the layer count).

Detection is **mutually exclusive and attention-first**: attention is identified by its head
projection widths, then MLP/MoE by the FFN intermediate width. A module is attention OR an
MLP, never both — so an attention block that happens to nest a gated projection is still
attention. Where no rule proves a role, the result is ``None`` and the UI degrades to a
generic card rather than guessing.
"""

from __future__ import annotations

from torch import nn

from aakar_api.infrastructure.introspection.node_metadata import category
from aakar_api.infrastructure.introspection.walk_context import WalkContext

# Role tags shipped in the Spec (mirrored in frontend/src/domain/spec.ts).
LAYER_STACK = "layer_stack"
CONTAINER = "container"
NORM = "norm"
TOKEN_EMBEDDING = "token_embedding"
POSITION_EMBEDDING = "position_embedding"
EMBEDDING = "embedding"
ATTENTION = "attention"
MLP = "mlp"
MOE = "moe"
LM_HEAD = "lm_head"
LINEAR = "linear"


def role(module: nn.Module, ctx: WalkContext) -> str | None:
    """Classify a module by facts. Returns a role tag, or None when unprovable."""
    cat = category(module)

    if cat == "container":
        return LAYER_STACK if _is_layer_stack(module, ctx) else CONTAINER

    # A norm is either a torch norm (by namespace) or a shape-preserving leaf carrying a
    # single 1-D affine weight (model-family RMSNorm/LayerNorm) — a structural fingerprint.
    if cat == NORM or (_is_leaf(module) and _has_one_d_weight(module)):
        return NORM

    if cat == "embedding":
        rows = getattr(module, "num_embeddings", None)
        if rows == ctx.vocab_size:
            return TOKEN_EMBEDDING
        if ctx.max_position and rows == ctx.max_position:
            return POSITION_EMBEDDING
        return EMBEDDING

    # The attention/MLP roles belong to the sub-layer *blocks*, not to the wrappers above
    # them: the root model and backbone (which hold the whole layer stack in their subtree)
    # and a full decoder layer all contain attention weights, but are not themselves an
    # attention block. Exclude them so the role lands on the right module.
    if not _contains_layer_stack(module, ctx) and not is_decoder_layer(module, ctx):
        # Attention BEFORE MLP: a block matching the head-projection widths is attention even
        # if it nests a gated projection that also looks FFN-shaped (DeepSeek's compressor).
        if _is_attention(module, ctx):
            return ATTENTION
        if _is_mlp(module, ctx):
            return MOE if _has_expert_collection(module, ctx) else MLP

    if cat == "linear":
        return LM_HEAD if getattr(module, "out_features", None) == ctx.vocab_size else LINEAR
    return None


def is_decoder_layer(module: nn.Module, ctx: WalkContext) -> bool:
    """A decoder layer is a module whose direct children include both an attention and an
    MLP/MoE sub-layer — derived from the children's facts, not from the layer's class name."""
    child_roles = {role(child, ctx) for _, child in module.named_children()}
    return ATTENTION in child_roles and bool(child_roles & {MLP, MOE})


def _is_layer_stack(module: nn.Module, ctx: WalkContext) -> bool:
    """The decoder stack: a ModuleList whose length is the configured layer count *and* whose
    elements are decoder layers. The decoder-layer check distinguishes it from an MoE experts
    ModuleList that happens to have the same length as the layer count."""
    return (
        isinstance(module, nn.ModuleList)
        and bool(ctx.num_layers)
        and len(module) == ctx.num_layers
        and is_decoder_layer(module[0], ctx)
    )


def _contains_layer_stack(module: nn.Module, ctx: WalkContext) -> bool:
    return any(_is_layer_stack(sub, ctx) for sub in module.modules())


# ─── shape/config fingerprints (facts) ──────────────────────────────────────────

def _weight_dims(module: nn.Module) -> set[int]:
    """Every dimension of every ≥2-D parameter in the subtree — Linear, Conv1D, and the
    fused 3-D expert tensors (`gate_up_proj` of shape [E, 2·I, H], etc.)."""
    dims: set[int] = set()
    for _, param in module.named_parameters(recurse=True):
        if param.dim() >= 2:
            dims.update(int(d) for d in param.shape)
    return dims


def _attn_widths(ctx: WalkContext) -> set[int]:
    """Projection widths unique to attention: the query/kv head widths and the fused-QKV
    width. The hidden size is excluded — every projection touches H, so an H-sized weight
    is never attention-discriminative (it would collide with the MLP's H-sided projections)."""
    qd = ctx.num_heads * ctx.head_dim
    kvd = ctx.num_kv_heads * ctx.head_dim
    widths = {qd + 2 * kvd, 3 * qd}  # fused QKV (covers fused MHA, e.g. GPT-2's c_attn)
    if ctx.num_kv_heads < ctx.num_heads:  # GQA: kv (and q) widths are attention-unique
        widths |= {kvd, qd}
    return {w for w in widths if w > 0 and w != ctx.hidden_size}


def _is_attention(module: nn.Module, ctx: WalkContext) -> bool:
    if _is_leaf(module) or not ctx.head_dim:
        return False
    if _weight_dims(module) & _attn_widths(ctx):
        return True
    # Legacy non-fused MHA with head_dim·num_heads == H: every head width collapses onto H,
    # so the discriminator is the square H×H projection (q/k/v/o) — which an MLP (H→I→H,
    # rectangular) never has.
    if ctx.num_heads * ctx.head_dim == ctx.hidden_size and not _is_mlp(module, ctx):
        return any(
            param.dim() == 2 and int(param.shape[0]) == ctx.hidden_size == int(param.shape[1])
            for _, param in module.named_parameters(recurse=True)
        )
    return False


def _is_mlp(module: nn.Module, ctx: WalkContext) -> bool:
    """A feed-forward block: its subtree holds a weight whose width is the FFN intermediate
    size I (or the fused 2·I). Catches dense MLPs (`up_proj` of shape [I, H]) and fused MoE
    experts (`gate_up_proj` of shape [E, 2·I, H]) alike — no projection name needed."""
    if _is_leaf(module) or not ctx.intermediate_size:
        return False
    dims = _weight_dims(module)
    return ctx.intermediate_size in dims or (2 * ctx.intermediate_size) in dims


def _has_expert_collection(module: nn.Module, ctx: WalkContext) -> bool:
    """MoE vs dense: the config declares num_local_experts and the block holds a collection
    sized to it — a ModuleList of that length, or a fused expert tensor with that leading dim."""
    if ctx.num_experts <= 0:
        return False
    for _, sub in module.named_modules():
        if isinstance(sub, nn.ModuleList) and len(sub) == ctx.num_experts:
            return True
    return any(
        param.dim() >= 3 and int(param.shape[0]) == ctx.num_experts
        for _, param in module.named_parameters(recurse=True)
    )


def _is_leaf(module: nn.Module) -> bool:
    return next(module.named_children(), None) is None


def _has_one_d_weight(module: nn.Module) -> bool:
    weight = getattr(module, "weight", None)
    return isinstance(weight, nn.Parameter) and weight.dim() == 1
