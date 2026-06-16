/**
 * Plain-language explanations for the things you can click that aren't full
 * `nn.Module`s: traced forward-pass operations (op glyphs), the hand-authored
 * semantic glyphs (Q heads / Scores / …), and — for real modules — a one-line
 * gloss keyed by the module's role.
 *
 * Everything here is keyed by the *bounded* backend vocabulary — op `category`,
 * a few high-signal ATen op names, synthetic glyph `type`, and module `role` —
 * never by a model-specific class name. New architectures inherit these for free.
 */

export type Explanation = Readonly<{
  /** Short human title, e.g. "Softmax". */
  title: string;
  /** What the operation/module does. */
  what: string;
  /** Optional: why it's there / what it's for. */
  why?: string;
}>;

const FALLBACK: Explanation = {
  title: "Operation",
  what: "A tensor operation this module runs during the forward pass.",
};

// Shared by both a category and a specific op, so they're named consts (not
// indexed off CATEGORY, which would be possibly-undefined under strict indexing).
const ATTENTION_EX: Explanation = {
  title: "Scaled dot-product attention",
  what: "Computes attention weights from queries·keys, then mixes values — the whole attention kernel in one fused op.",
  why: "The fused form (SDPA / flash-attention) avoids materializing the full S×S score matrix.",
};
const EMBEDDING_EX: Explanation = {
  title: "Embedding lookup",
  what: "Gathers a row from a learned table for each input id.",
  why: "Turns discrete token ids into the continuous vectors the network operates on.",
};

// Coarse op categories — the default explanation when no specific op matches.
const CATEGORY: Record<string, Explanation> = {
  matmul: {
    title: "Matrix multiply",
    what: "Multiplies two tensors — the core arithmetic of every linear projection and attention score.",
    why: "This is where almost all of a transformer's FLOPs (and learnable weight) live.",
  },
  activation: {
    title: "Activation",
    what: "Applies a non-linear function elementwise to its input.",
    why: "Without a non-linearity, stacked linear layers would collapse into a single linear map.",
  },
  norm: {
    title: "Normalization math",
    what: "One step of a normalization (mean / variance / reciprocal-sqrt) that rescales activations.",
    why: "Keeps activation magnitudes stable across depth so training stays well-conditioned.",
  },
  elementwise: {
    title: "Elementwise op",
    what: "Combines tensors position-by-position (add, multiply, masking, …) with no mixing across positions.",
    why: "Residual adds and gating live here — cheap glue between the heavy matmuls.",
  },
  embedding: EMBEDDING_EX,
  attention: ATTENTION_EX,
  shape: {
    title: "Shape op",
    what: "Rearranges a tensor's layout (reshape, transpose, split, concat) without changing any values.",
    why: "Pure bookkeeping — usually splitting hidden dims into heads or putting them back. Hidden by default.",
  },
  other: FALLBACK,
};

// High-signal specific ops that deserve a sharper explanation than their category.
const OP: Record<string, Explanation> = {
  softmax: {
    title: "Softmax",
    what: "Turns raw attention scores into a probability distribution over positions (each row sums to 1).",
    why: "Decides how much each key/value position contributes to the output for a given query.",
  },
  _softmax: {
    title: "Softmax",
    what: "Turns raw attention scores into a probability distribution over positions (each row sums to 1).",
    why: "Decides how much each key/value position contributes to the output for a given query.",
  },
  _safe_softmax: {
    title: "Softmax",
    what: "Numerically-stable softmax over the attention scores (each row sums to 1).",
    why: "Decides how much each key/value position contributes to the output for a given query.",
  },
  scaled_dot_product_attention: ATTENTION_EX,
  rsqrt: {
    title: "Reciprocal sqrt",
    what: "Computes 1/√x — the scaling factor in RMSNorm / LayerNorm.",
    why: "Divides activations by their root-mean-square to normalize their magnitude.",
  },
  bmm: {
    title: "Batched matmul",
    what: "A matrix multiply run independently per batch/head — e.g. Q·Kᵀ scores, or attention·V.",
    why: "Lets every attention head do its own score/mix without a Python loop.",
  },
  embedding: EMBEDDING_EX,
};

// The hand-authored semantic glyphs from semanticFlow.ts (attention / MLP views).
const SYNTHETIC: Record<string, Explanation> = {
  attention_heads: {
    title: "Per-head split",
    what: "Reshapes a projection's output into separate attention heads, each attending independently.",
    why: "Multiple heads let the layer attend to several relationships at once. Not a module — a reshape inside forward().",
  },
  attention_scores: {
    title: "Attention scores (Q·Kᵀ)",
    what: "Each query is dotted with every key to score how relevant each position is, scaled by 1/√head_dim.",
    why: "Produces the [heads, S, S] matrix that softmax then normalizes. Computed inline, not a submodule.",
  },
  attention_softmax: {
    title: "Softmax + mask",
    what: "Masks disallowed positions (e.g. future tokens) and normalizes each query's scores to sum to 1.",
    why: "Converts raw scores into attention weights. A functional step, not a learnable module.",
  },
  attention_mix: {
    title: "Weighted sum of values",
    what: "Multiplies the attention weights by the value vectors to produce each position's context.",
    why: "The actual 'attending' — gathering information from attended positions. Inline math, not a module.",
  },
  mlp_multiply: {
    title: "Gate × up",
    what: "Elementwise product of the gated branch and the up-projection in a SwiGLU-style MLP.",
    why: "The gating that makes a gated MLP more expressive than a plain two-layer one. Inline, not a module.",
  },
  flow_residual: {
    title: "Residual add",
    what: "Adds the block's input back to its output (the skip connection).",
    why: "Lets gradients and signal flow straight through deep stacks. Inline addition, not a module.",
  },
  flow_input: {
    title: "Block input",
    what: "The hidden-state tensor entering this block.",
  },
};

// Real modules — a one-line gloss shown atop their detail panel, keyed by role.
const ROLE: Record<string, Explanation> = {
  attention: {
    title: "Attention",
    what: "Mixes information across positions: projects to queries/keys/values, scores them, and gathers a weighted combination of values.",
  },
  mlp: {
    title: "Feed-forward (MLP)",
    what: "A position-wise two/three-matrix network that expands the hidden dim, applies a non-linearity, and projects back.",
  },
  moe: {
    title: "Mixture of experts",
    what: "A router picks a few expert MLPs per token and combines their outputs — more capacity at similar compute.",
  },
  norm: {
    title: "Normalization",
    what: "Rescales activations (LayerNorm / RMSNorm) so their magnitude stays stable across the network's depth.",
  },
  token_embedding: {
    title: "Token embedding",
    what: "Maps each input token id to a learned vector — the model's entry point from discrete text to continuous space.",
  },
  position_embedding: {
    title: "Position embedding",
    what: "Injects information about each token's position so the otherwise order-agnostic attention knows sequence order.",
  },
  lm_head: {
    title: "LM head",
    what: "Projects the final hidden state to a score (logit) for every token in the vocabulary.",
  },
  linear: {
    title: "Linear projection",
    what: "A learned matrix multiply (optionally + bias) that maps one feature space to another.",
  },
  layer_stack: {
    title: "Decoder layers",
    what: "The repeated stack of identical decoder blocks — the bulk of the model's depth and parameters.",
  },
};

/** Explanation for a clickable synthetic flow node: an op glyph or a semantic glyph. */
export function explainFlowNode(node: {
  type: string;
  params: Readonly<Record<string, string | number | boolean>>;
}): Explanation {
  if (node.type === "operation") {
    const opName = typeof node.params.op === "string" ? node.params.op : "";
    const category = typeof node.params.category === "string" ? node.params.category : "other";
    return OP[opName] ?? CATEGORY[category] ?? FALLBACK;
  }
  return SYNTHETIC[node.type] ?? FALLBACK;
}

/** One-line gloss for a real module, keyed by its backend role. Null if none. */
export function explainRole(role: string | undefined): Explanation | null {
  return role ? (ROLE[role] ?? null) : null;
}
