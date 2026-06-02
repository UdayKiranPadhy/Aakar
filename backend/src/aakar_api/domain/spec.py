"""The composition Spec — the JSON contract returned by the API.

This module is the **single source of truth** for the Spec shape. The TypeScript
mirror lives at `frontend/src/domain/spec.ts` and must be kept in sync by hand;
both are documented in `docs/spec-contract.md`.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


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
