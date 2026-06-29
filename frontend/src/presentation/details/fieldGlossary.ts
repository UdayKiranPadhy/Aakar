/**
 * Field glossary — one-line "what is this field" tooltips for the detail panel.
 *
 * Keyed by the **bounded** Spec/Node vocabulary plus the stable PyTorch / HF
 * config attribute names — never by a model-specific value. A field the backend
 * adds later simply has no entry yet (the row still renders, just without a
 * tooltip), so this stays future-proof as `transformers` evolves.
 *
 * Same philosophy as `explanations.ts`: explain the vocabulary, not the model
 * family. Both display aliases (`path`, `class`, `weight`) and canonical names
 * (`module_path`, `module_class`, `weight_shape`) map to the same text, so a
 * caller can pass whichever it has.
 */

// Shared text for fields that surface under more than one label.
const PATH = "Dotted attribute path to this module — paste it into the source to find this exact submodule.";
const CLASS = "The Python class this module is an instance of. Links to its definition on GitHub when available.";
const SHAPE_IN = "Symbolic shape of the tensor entering this module. B = batch, S = sequence length.";
const SHAPE_OUT = "Symbolic shape of the tensor leaving this module. B = batch, S = sequence length.";
const WEIGHT = "Shape of this module's weight tensor, read from nn.Parameter.shape on the meta device (no weights are downloaded).";
const BIAS = "Shape of this module's bias tensor. Absent when the module has no bias.";
const DTYPE = "Intended parameter precision from the model config (e.g. bfloat16). Drives the memory estimate.";
const DTYPE_ACTUAL = "Actual precision of this module's weight/bias as built on the meta device — can differ from the model's declared dtype (e.g. fp32 norms inside a bf16 model).";
const ACTIVATION = "Non-linear activation used inside the feed-forward block (e.g. silu, gelu).";
const EXPERTS = "Total number of expert feed-forward networks in this mixture-of-experts layer.";
const EXPERTS_PER_TOK = "How many experts each token is routed to (top-k). The rest stay idle, so compute scales with k, not the total expert count.";
const ATTN = "Attention kernel the model dispatches to: eager, sdpa, or flash_attention_2.";
const POS = "How token order is injected: rope, learned, alibi, or sinusoidal — inferred from config facts.";
const TIED = "Whether the input embedding and output (LM-head) weight matrices are the same tensor.";
const GQA = "Grouped-query attention ratio = query heads ÷ key/value heads. 1 = MHA; higher means fewer KV heads shared across queries.";
const SLIDING = "Each token attends only to this many preceding positions (windowed attention).";
const NUM_HEADS = "Number of attention heads the layer splits its projections into.";
const QKV = "Per-head shape after the multi-head reshape. Keys/values are narrower than queries under grouped-query attention.";

const FIELD_TIPS: Record<string, string> = {
  // ── Identity & source ──
  path: PATH,
  module_path: PATH,
  class: CLASS,
  module_class: CLASS,
  role: "Semantic role inferred by the backend from facts only — config dimensions and real tensor shapes, never class or attribute names.",
  category: 'Tag derived from the module\'s Python namespace (e.g. torch.nn.modules.linear → "linear"). Groups every class in a namespace without naming them.',

  // ── Shapes ──
  input: SHAPE_IN,
  input_shape: SHAPE_IN,
  output: SHAPE_OUT,
  output_shape: SHAPE_OUT,
  weight: WEIGHT,
  weight_shape: WEIGHT,
  bias: BIAS,
  bias_shape: BIAS,
  weight_dtype: DTYPE_ACTUAL,
  bias_dtype: DTYPE_ACTUAL,

  // ── Counts & cost ──
  param_count: "Total learnable parameters in this module and everything beneath it (recursive sum of numel()).",
  memory_bytes: "Parameter memory for this subtree = parameter count × bytes-per-element at the model's dtype.",
  flops: "Theoretical forward-pass floating-point ops at the reference batch/sequence size — only for modules with a closed-form count (Linear, norms).",
  // FLOPs breakdown components (Node.flops_detail).
  matmul: "FLOPs of this layer's matrix multiply at the reference batch/sequence size.",
  attn_context: "FLOPs of the scores·V matmul — weighting the value vectors by the attention scores.",

  // ── Spec-level (Model section) ──
  dtype: DTYPE,
  param_dtype: DTYPE,
  attention: ATTN,
  attn_impl: ATTN,
  position: POS,
  position_encoding: POS,
  "tied embeddings": TIED,
  tied_word_embeddings: TIED,
  GQA: GQA,
  gqa_ratio: GQA,
  "sliding window": SLIDING,
  sliding_window: SLIDING,
  MoE: "Mixture-of-experts: the total number of experts and how many are routed per token.",
  "bos / eos": "Special token ids that mark the beginning and end of a sequence.",
  quantized: "The config carries a quantization scheme (GPTQ / AWQ / bitsandbytes).",

  // ── Common config params ──
  in_features: "Size of each input vector to this linear layer.",
  out_features: "Size of each output vector this linear layer produces.",
  has_bias: "Whether this layer adds a learnable bias after the matrix multiply.",
  num_embeddings: "Number of rows in the embedding table — the vocabulary size (token embeddings) or context length (position embeddings).",
  embedding_dim: "Width of each embedding vector — the model's hidden size.",
  eps: "Small constant added inside a normalization for numerical stability.",
  num_heads: NUM_HEADS,
  num_attention_heads: NUM_HEADS,
  num_key_value_heads: "Number of key/value heads — fewer than query heads under grouped-query attention.",
  head_dim: "Width of each attention head = hidden size ÷ number of heads.",
  hidden_size: "The model's residual-stream width — the size of the vectors flowing between layers.",
  intermediate_size: "Inner width of the feed-forward (MLP) block — usually several × the hidden size.",
  vocab_size: "Number of distinct tokens the model can represent.",
  hidden_act: ACTIVATION,
  activation_function: ACTIVATION,
  num_experts: EXPERTS,
  num_local_experts: EXPERTS,
  num_experts_per_tok: EXPERTS_PER_TOK,

  // ── Intermediates (Tensor path) ──
  q: QKV,
  k: QKV,
  v: QKV,
  attn_scores: "Shape of the query·keyᵀ score matrix — the quadratic [B, heads, S, S] attention map.",
  up: "Shape after the MLP's up-projection — the expanded hidden state before it is projected back down.",

  // ── Buffers ──
  inv_freq: "RoPE rotary-frequency buffer — precomputed inverse frequencies, not a learnable parameter.",
};

/** One-line definition for a field key, or undefined when none is known. */
export function fieldTip(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return FIELD_TIPS[key] ?? FIELD_TIPS[key.toLowerCase()];
}
