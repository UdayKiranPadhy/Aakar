"""Pure functions for parameter counts of common LLM building blocks.

These are kept as free functions, not a class, because they have no state and
a class wrapper would be ceremony. Each carries a one-line WHY comment that
traces the formula to the underlying math — this is the study-repo angle:
when you read about a new variant, add a function here and explain why.
"""

from __future__ import annotations


def embedding_params(vocab_size: int, hidden_size: int) -> int:
    # One learned vector per token in the vocab.
    return vocab_size * hidden_size


def linear_params(in_features: int, out_features: int, bias: bool = False) -> int:
    # A dense linear: in*out for the weight, +out for the bias if present.
    return in_features * out_features + (out_features if bias else 0)


def gqa_attention_params(
    hidden_size: int,
    head_dim: int,
    num_heads: int,
    num_kv_heads: int,
) -> int:
    # Q + O each project across all heads: 2 * num_heads * head_dim * hidden_size.
    # K + V each project across the (smaller) KV heads: 2 * num_kv_heads * head_dim * hidden_size.
    # GQA reduces K/V parameter cost by num_heads / num_kv_heads (e.g. 4x for Llama-3 8B).
    return hidden_size * head_dim * (2 * num_heads + 2 * num_kv_heads)


def swiglu_mlp_params(hidden_size: int, ffn_size: int) -> int:
    # SwiGLU = down(silu(gate(x)) * up(x)) — three linears, each hidden ↔ ffn. No biases in Llama.
    return 3 * hidden_size * ffn_size


def rmsnorm_params(hidden_size: int) -> int:
    # One learned scale parameter per channel. No bias, unlike LayerNorm.
    return hidden_size


def lm_head_params(hidden_size: int, vocab_size: int, tied: bool) -> int:
    # Untied: a full hidden×vocab projection. Tied: 0, since weights are reused from the embedding.
    return 0 if tied else hidden_size * vocab_size
