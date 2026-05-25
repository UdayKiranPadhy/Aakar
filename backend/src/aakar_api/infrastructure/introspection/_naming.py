"""Attribute and child-name conventions used by transformer modules.

These strings name things on `nn.Module` instances — config attributes stored
on a module, and the names of its projection children — that the introspector
uses to recognise "this is an attention block" or "this is an MLP" without
depending on per-family class names like `LlamaSdpaAttention` vs
`Qwen3Attention`.

Why these names are hardcoded
-----------------------------
They are *not* exported as constants by `transformers` or `torch`. They live
only as string literals inside each model's `modeling_*.py` file:

    class LlamaAttention(nn.Module):
        def __init__(self, config, layer_idx):
            self.num_heads = config.num_attention_heads   # literal string
            self.q_proj = nn.Linear(...)                  # literal string
            ...

There is no `transformers.ATTENTION_ATTRS`, no field enum on `PretrainedConfig`
(it's a regular Python class, not a dataclass), no abstract base class marking
a module as "attention". HF reimplements attention from scratch in every model
file rather than subclassing `torch.nn.MultiheadAttention`, and torch itself
doesn't define HF's naming conventions either.

Why these names are still stable
--------------------------------
State-dict naming is a wire-format contract. A pretrained checkpoint saved
with key `model.layers.0.self_attn.q_proj.weight` can only load into a module
that exposes a `q_proj` attribute. Any new architecture that wants to load
existing weights MUST keep these names. That gives us a real stability
guarantee — much stronger than class names, which can be renamed freely
(LlamaAttention → LlamaSdpaAttention → LlamaFlashAttention2 …) without
breaking weight loading.

Extending
---------
When a new naming variant shows up (e.g. an experimental `proj_q`, or a new
MoE expert layout), add it to the appropriate tuple/frozenset below. One-line
change, no other code touches these strings directly.
"""

from __future__ import annotations

# ─── Attention ──────────────────────────────────────────────────────────────
# Module attributes that name the head-count config. Llama/Qwen/Mistral set
# `self.num_heads = config.num_attention_heads` in __init__; some other
# families store `num_attention_heads` on the module directly.
ATTENTION_HEAD_ATTRS: tuple[str, ...] = ("num_heads", "num_attention_heads")

# Key/value head count for grouped-query attention. Distinct from head count;
# falls back to head count when not present (MHA case).
ATTENTION_KV_HEAD_ATTRS: tuple[str, ...] = ("num_key_value_heads", "num_kv_heads")

# Per-head dimensionality. Stored as `head_dim` consistently across families.
ATTENTION_HEAD_DIM_ATTRS: tuple[str, ...] = ("head_dim",)

# Projection submodule names. The q/k/v split is universal in modern
# decoder-only LLMs; `c_attn` is GPT-2's fused QKV projection.
ATTENTION_PROJECTION_NAMES: frozenset[str] = frozenset(
    {"q_proj", "k_proj", "v_proj", "c_attn"}
)


# ─── MLP / FFN ──────────────────────────────────────────────────────────────
# Module attributes that name the inner-FFN width.
MLP_SIZE_ATTRS: tuple[str, ...] = ("intermediate_size", "ffn_dim")

# FFN projection submodule names across the families we see in stock
# `transformers`:
#   - Gated MLPs (Llama/Qwen/Mistral): `gate_proj` + `up_proj` + `down_proj`
#   - GPT-2 style: `c_fc` (+ `c_proj`, omitted here since attention also uses
#     `c_proj` for its output projection — `c_fc` alone is enough to fingerprint
#     a GPT-2 MLP)
#   - Single-letter weight tying (Mixtral experts): `w1` / `w2` / `w3`
#   - Encoder/decoder style: `fc_in` / `fc_out`
MLP_PROJECTION_NAMES: frozenset[str] = frozenset(
    {"gate_proj", "up_proj", "down_proj", "w1", "w2", "w3", "c_fc", "fc_in", "fc_out"}
)
