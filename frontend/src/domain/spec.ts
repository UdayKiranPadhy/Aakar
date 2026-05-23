/**
 * Composition Spec — JSON shape returned by GET /api/architecture.
 *
 * Hand-mirrored from `backend/src/aakar_api/domain/spec.py` (the source of
 * truth). Documented as a canonical contract in `docs/spec-contract.md`.
 * When the contract changes, this file, the Pydantic models, and the doc
 * must all update in the same commit.
 */

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
  memory_bytes?: number;
  buffers?: Readonly<Record<string, ReadonlyArray<number>>>;
  activation?: string;
  flops?: number;
  /**
   * Per-class intermediate tensor shapes derived from the module + config.
   * Populated only for `*Attention` (q / k / v / attn_scores) and `*MLP`
   * (up) modules. Values are symbolic strings like `"[B, 32, S, 128]"`.
   */
  intermediates?: Readonly<Record<string, string>>;
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
  tied_word_embeddings?: boolean;
  flops_reference?: Readonly<{ batch_size: number; seq_len: number }>;
}>;
