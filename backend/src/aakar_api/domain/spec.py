"""The composition Spec — the JSON contract returned by the API.

This module is the **single source of truth** for the Spec shape. The TypeScript
mirror lives at `frontend/src/domain/spec.ts` and must be kept in sync by hand;
both are documented in `docs/spec-contract.md`.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Operation(BaseModel):
    """One tensor operation performed inside a module's `forward()`.

    Captured by a single fake-tensor trace of the model (see
    `infrastructure/introspection/fx_operations.py`): every ATen op the forward
    runs is recorded and attributed to the innermost `nn.Module` executing it.
    So a `Linear` reports its `mm`, an RMSNorm reports `pow/mean/rsqrt/mul`, a
    decoder layer reports its two residual `add`s, and attention reports the
    Q·Kᵀ / softmax / ·V math. The op vocabulary is ATen (torch's dispatch level),
    keyed off stable op names — never off the model family.

    Best-effort: present only when the model traces cleanly. The list is in
    execution order; `inputs` references the `id`s of the ops (anywhere in the
    trace) that produced this op's tensor arguments, so a dataflow graph can be
    reconstructed from it.
    """

    model_config = ConfigDict(frozen=True)

    id: str  # unique within the whole trace, e.g. "bmm_2" — referenced by `inputs`
    op: str  # ATen op name as dispatched: "mm", "bmm", "_safe_softmax", "add", "silu"
    label: str  # humanized op name for display, e.g. "batched matmul", "softmax"
    # Coarse bucket for color/grouping in the UI. One of:
    #   "matmul" | "activation" | "norm" | "elementwise" | "shape" | "embedding"
    #   | "attention" | "other"
    category: str
    # `id`s of the ops that produced this op's input tensors (dataflow edges).
    inputs: list[str] = Field(default_factory=list)
    # Symbolic output shape, e.g. "[B, 32, S, S]" (batch → B, sequence → S, rest
    # literal). None when the op has no single tensor output.
    out_shape: str | None = None


class Node(BaseModel):
    """A single block in the architecture diagram.

    Mirrors one `nn.Module` from the introspected `transformers` model. `children`
    follows the real submodule tree (e.g. `LlamaForCausalLM → LlamaModel → ModuleList
    → LlamaDecoderLayer → LlamaSdpaAttention → Linear`).
    """

    model_config = ConfigDict(frozen=True)

    id: str
    type: str
    label: str
    meta: str | None = None
    params: dict[str, Any] = Field(default_factory=dict)
    children: list[Node] | None = None
    has_internals: bool = False
    param_count: int | None = None
    input_shape: str | None = None
    output_shape: str | None = None
    module_class: str | None = None
    module_path: str | None = None
    weight_shape: list[int] | None = None
    bias_shape: list[int] | None = None
    # Recursive memory footprint of this subtree, in bytes, at the model's declared `param_dtype` (Spec-level).
    memory_bytes: int | None = None
    # Non-parameter tensors registered with `register_buffer` — RoPE inv_freq,
    # causal masks, etc. Map of buffer name → shape (only this module's own,
    # not recursive).
    buffers: dict[str, list[int]] | None = None
    # Category derived from the module's Python namespace
    #   "activation" — torch.nn.modules.activation, transformers.activations
    #   "norm"       — torch.nn.modules.normalization, torch.nn.modules.batchnorm
    #   "dropout"    — torch.nn.modules.dropout
    #   "linear"     — torch.nn.modules.linear
    #   "embedding"  — torch.nn.modules.sparse
    #   "container"  — torch.nn.modules.container (ModuleList, Sequential, …)
    category: str | None = None
    # Semantic role, decided from facts only (config dims + real tensor shapes +
    # namespace category + structure) — never from class/attribute/child names.
    # See infrastructure/introspection/role.py. One of:
    #   "layer_stack" — the ModuleList of decoder layers (len == num_hidden_layers)
    #   "container"   — any other ModuleList/Sequential
    #   "norm"        — LayerNorm/RMSNorm (namespace, or a leaf with one 1-D weight)
    #   "token_embedding" / "position_embedding" / "embedding"
    #   "attention"   — block with head-width projections (nH·hd / nKV·hd / fused QKV)
    #   "mlp" / "moe" — FFN block (intermediate-width projection); moe when experts present
    #   "lm_head"     — a Linear projecting to vocab_size
    #   "linear"      — any other Linear leaf
    # None when no rule proves a role (the UI then renders a generic card).
    role: str | None = None
    # GitHub link to the module's class definition. Populated for stock
    # `transformers.*` and `torch.*` classes (pinned to the installed
    # package version when it's a clean semver, else `main`). None for
    # custom user code.
    source_url: str | None = None
    # Theoretical forward-pass FLOPs at Spec.flops_reference. Only populated for
    # modules whose count is determined by the module alone (Linear, norms).
    flops: int | None = None
    # Per-class intermediate tensor shapes that aren't visible from in/out
    # alone. Populated only for `*Attention` (q/k/v after multi-head reshape,
    # attention scores) and `*MLP` (after the up projection) — they expose
    # the multi-head split, GQA grouping, the S² attention map, and the MLP
    # expansion ratio. Values are free-form symbolic strings like
    # `"[B, 32, S, 128]"`.
    intermediates: dict[str, str] | None = None
    # The tensor operations this module's own `forward()` runs (not recursive —
    # a submodule's ops live on that submodule's Node), in execution order.
    # Captured by a fake-tensor trace; None when the model couldn't be traced.
    operations: list[Operation] | None = None


class Spec(BaseModel):
    """Top-level composition spec for one model."""

    model_config = ConfigDict(frozen=True)

    model_id: str
    model_type: str
    config_summary: dict[str, Any]
    graph: list[Node]
    notes: list[str] | None = None
    # Intended parameter dtype from `config.torch_dtype` (e.g. "float16",
    # "bfloat16"). Drives the memory_bytes calculation on every Node.
    param_dtype: str | None = None
    # Attention implementation in use: "eager" | "sdpa" | "flash_attention_2".
    # Read from `config._attn_implementation` or inferred from the self-attn
    # class-name suffix.
    attn_impl: str | None = None
    # "rope" | "alibi" | "learned" | "sinusoidal" — inferred from the presence
    # of rotary modules or positional-embedding sub-modules.
    position_encoding: str | None = None
    # True iff `model.get_input_embeddings() is model.get_output_embeddings()`
    # after the model is built on meta. The config flag isn't always honored.
    tied_word_embeddings: bool | None = None
    # Hypothetical batch/seq for the FLOPs estimate on each Node.
    flops_reference: dict[str, int] | None = None
    # The complete, unfiltered config (`config.to_dict()`) so a generic Config
    # Explorer can render every key
    config_full: dict[str, Any] | None = None
