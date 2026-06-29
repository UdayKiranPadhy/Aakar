/**
 * Composition Spec — JSON shape returned by GET /api/architecture.
 *
 * Hand-mirrored from `backend/src/aakar_api/domain/spec.py` (the source of
 * truth). Documented as a canonical contract in `docs/spec-contract.md`.
 * When the contract changes, this file, the Pydantic models, and the doc
 * must all update in the same commit.
 */

/**
 * One tensor operation performed inside a module's `forward()`, captured by a
 * fake-tensor trace on the backend (see `infrastructure/introspection/
 * fx_operations.py`). The op vocabulary is ATen (torch's dispatch level):
 * a `Linear` reports `mm`, an RMSNorm reports `pow/mean/rsqrt/mul`, attention
 * reports its Q·Kᵀ / softmax / ·V math. Best-effort — absent when the model
 * couldn't be traced.
 */
export type Operation = Readonly<{
  id: string; // unique within the trace, referenced by other ops' `inputs`
  op: string; // ATen op name, e.g. "mm", "bmm", "_safe_softmax", "add"
  label: string; // humanized op name, e.g. "batched matmul", "softmax"
  /** Color/grouping bucket: matmul | activation | norm | elementwise | shape | embedding | attention | other */
  category: string;
  /** `id`s of the ops that produced this op's input tensors (dataflow edges). */
  inputs: ReadonlyArray<string>;
  /** Symbolic output shape, e.g. `"[B, 32, S, S]"`. Absent when there's no single tensor output. */
  out_shape?: string;
}>;

export type Node = Readonly<{
  id: string;
  type: string;
  label: string;
  meta?: string;
  params: Readonly<Record<string, string | number | boolean>>;
  children?: ReadonlyArray<Node>;
  has_internals?: boolean;
  param_count?: number;
  input_shape?: string;
  output_shape?: string;
  module_class?: string;
  module_path?: string;
  weight_shape?: ReadonlyArray<number>;
  bias_shape?: ReadonlyArray<number>;
  /**
   * Actual dtype of this module's own weight / bias as built on the meta device
   * (e.g. `"float32"`, `"bfloat16"`). Distinct from the Spec-level `param_dtype`
   * (the *declared* `config.torch_dtype`): mixed precision — e.g. fp32 norms in a
   * bf16 model — is only visible here. Absent when the module has no weight / bias.
   */
  weight_dtype?: string;
  bias_dtype?: string;
  memory_bytes?: number;
  buffers?: Readonly<Record<string, ReadonlyArray<number>>>;
  /**
   * Free-form semantic category derived from the module's Python namespace
   * (no class-name matching). Current values:
   *   - `"activation"` — torch.nn.modules.activation, transformers.activations
   *   - `"norm"`       — torch.nn.modules.normalization, batchnorm
   *   - `"dropout"`    — torch.nn.modules.dropout
   *   - `"linear"`     — torch.nn.modules.linear
   *   - `"embedding"`  — torch.nn.modules.sparse
   *   - `"container"`  — torch.nn.modules.container (ModuleList, Sequential, …)
   * Used by `BlockRegistry` as a fallback key when no `type`-specific renderer
   * is registered.
   */
  category?: string;
  /**
   * Semantic role, decided by the backend from facts only (config dims + real
   * tensor shapes + namespace `category` + structure) — never from class /
   * attribute / child names. See `infrastructure/introspection/role.py`.
   *   - `"layer_stack"`        — the ModuleList of decoder layers
   *   - `"container"`          — any other ModuleList/Sequential
   *   - `"norm"`               — LayerNorm/RMSNorm
   *   - `"token_embedding"` | `"position_embedding"` | `"embedding"`
   *   - `"attention"`          — block with head-width projections
   *   - `"mlp"` | `"moe"`      — FFN block; `moe` when experts are present
   *   - `"lm_head"`            — a Linear projecting to vocab_size
   *   - `"linear"`             — any other Linear leaf
   * Absent (`undefined`) when no rule proves a role — the UI renders a generic card.
   */
  role?: string;
  /**
   * GitHub link to the module's class definition. Populated for stock
   * `transformers.*` and `torch.*` classes (pinned to the installed package
   * version when it's a clean semver, otherwise `main`). Absent for custom
   * user code.
   */
  source_url?: string;
  flops?: number;
  /**
   * Additive FLOPs cost components of this module's OWN forward (child modules
   * carry their own — nothing here double-counts them). Bounded keys: `matmul`
   * (Linear), `norm`, `attn_scores` / `attn_context` (the two SDPA matmuls). Where
   * `flops` is also set the values sum to it. Absent when no component is known.
   */
  flops_detail?: Readonly<Record<string, number>>;
  /**
   * Per-class intermediate tensor shapes derived from the module + config.
   * Populated only for `*Attention` (q / k / v / attn_scores) and `*MLP`
   * (up) modules. Values are symbolic strings like `"[B, 32, S, 128]"`.
   */
  intermediates?: Readonly<Record<string, string>>;
  /**
   * The tensor operations this module's own `forward()` runs (not recursive —
   * a submodule's ops live on that submodule's Node), in execution order.
   * Absent when the model couldn't be traced.
   */
  operations?: ReadonlyArray<Operation>;
}>;

export type Spec = Readonly<{
  model_id: string;
  model_type: string;
  config_summary: Readonly<Record<string, string | number | boolean | object>>;
  graph: ReadonlyArray<Node>;
  notes?: ReadonlyArray<string>;
  param_dtype?: string;
  attn_impl?: string;
  position_encoding?: string;
  /**
   * Curated RoPE parameters when the model uses rotary embeddings, e.g.
   * `{ theta: 500000, scaling: { rope_type: "llama3", … } }` copied verbatim from
   * the config. Model-wide, so it lives at Spec level next to `position_encoding`.
   * Absent when RoPE isn't used.
   */
  rope_parameters?: Readonly<Record<string, unknown>>;
  tied_word_embeddings?: boolean;
  flops_reference?: Readonly<{ batch_size: number; seq_len: number }>;
  /**
   * The complete, unfiltered config (`config.to_dict()`). Unlike the curated
   * `config_summary`, this is NOT key-filtered — the Config Explorer renders
   * every key generically. May contain nested objects (e.g. `rope_scaling`).
   */
  config_full?: Readonly<Record<string, unknown>>;
  /**
   * True once the backend's fake-tensor forward trace has run for this model.
   * `GET /api/architecture` returns the structure with this `false` and every
   * `Node.operations` absent (the trace is the slow part, so it's deferred);
   * `GET /api/operations` returns the same tree with the trace applied and this
   * `true`. The frontend fetches operations in the background and swaps in the
   * enriched spec — see `useArchitecture`.
   */
  operations_traced?: boolean;
}>;
