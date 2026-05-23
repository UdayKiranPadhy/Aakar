"""Adapter for the Llama family (handles llama, mistral, qwen2, qwen3).

These architectures share an identical macro-structure for our purposes:
embedding → N × (pre-norm RMSNorm + GQA self-attention + residual + pre-norm
RMSNorm + SwiGLU FFN + residual) → final RMSNorm → LM head.

Their `config.json` files use the same key names for the fields we care about,
so one adapter handles all four. Variant-specific behavior (e.g., Qwen3's
larger vocab tying) is selected via `ModelConfig` properties, not by branching
on `model_type` — branches would imply a new adapter is needed.
"""

from __future__ import annotations

from aakar_api.adapters.base import ArchitectureAdapter
from aakar_api.adapters.building import (
    BlockBuilder,
    embedding_params,
    gqa_attention_params,
    linear_params,
    lm_head_params,
    rmsnorm_params,
    swiglu_mlp_params,
)
from aakar_api.domain.model_config import ModelConfig
from aakar_api.domain.spec import Node, Spec


class LlamaFamilyAdapter(ArchitectureAdapter):
    """Builds the architectural Spec for llama / mistral / qwen2 / qwen3 models."""

    @property
    def supported_model_types(self) -> tuple[str, ...]:
        return ("llama", "mistral", "qwen2", "qwen3")

    def build(self, config: ModelConfig, model_id: str) -> Spec:
        graph: list[Node] = [
            self._build_embedding(config),
            *[self._build_decoder_block(config, i) for i in range(config.num_hidden_layers)],
            self._build_final_norm(config),
            self._build_lm_head(config),
        ]
        return Spec(
            model_id=model_id,
            model_type=config.model_type,
            config_summary=self._summarize(config),
            graph=graph,
        )

    # ------------------------------------------------------------------
    # Private builders. Kept here (not in `building/`) because they're
    # specific to the Llama-family layout. A new architecture with a
    # different layout would have its own private builders.
    # ------------------------------------------------------------------

    def _build_embedding(self, c: ModelConfig) -> Node:
        return (
            BlockBuilder("embed", "token_embedding")
            .label("Input embedding")
            .meta("tokens → vectors")
            .params(vocab_size=c.vocab_size, hidden_size=c.hidden_size)
            .param_count(embedding_params(c.vocab_size, c.hidden_size))
            .shapes(input="[B, T]", output=f"[B, T, {c.hidden_size}]")
            .build()
        )

    def _build_decoder_block(self, c: ModelConfig, idx: int) -> Node:
        bid = f"block_{idx + 1}"
        children: list[Node] = [
            self._build_rmsnorm(f"{bid}.norm_1", c.hidden_size, "pre-attention norm"),
            self._build_attention(f"{bid}.attn", c),
            self._build_residual(f"{bid}.add_1"),
            self._build_rmsnorm(f"{bid}.norm_2", c.hidden_size, "pre-FFN norm"),
            self._build_ffn(f"{bid}.ffn", c),
            self._build_residual(f"{bid}.add_2"),
        ]
        block_params = sum(n.param_count or 0 for n in children)
        return (
            BlockBuilder(bid, "decoder_block")
            .label(f"Transformer block {idx + 1}")
            .meta("self-attention + FFN")
            .params(
                hidden_size=c.hidden_size,
                num_heads=c.num_attention_heads,
                num_kv_heads=c.num_key_value_heads,
                ffn_size=c.intermediate_size,
            )
            .param_count(block_params)
            .children(children)
            .shapes(input=f"[B, T, {c.hidden_size}]", output=f"[B, T, {c.hidden_size}]")
            .build()
        )

    def _build_attention(self, attn_id: str, c: ModelConfig) -> Node:
        # GQA: Q has num_heads × head_dim outputs; K/V have num_kv_heads × head_dim each.
        q_out = c.num_attention_heads * c.head_dim
        kv_out = c.num_key_value_heads * c.head_dim
        q_params = linear_params(c.hidden_size, q_out)
        k_params = linear_params(c.hidden_size, kv_out)
        v_params = linear_params(c.hidden_size, kv_out)
        o_params = linear_params(q_out, c.hidden_size)
        children: list[Node] = [
            self._build_linear(f"{attn_id}.q", "Q proj", c.hidden_size, q_out, q_params),
            self._build_linear(f"{attn_id}.k", "K proj", c.hidden_size, kv_out, k_params),
            self._build_linear(f"{attn_id}.v", "V proj", c.hidden_size, kv_out, v_params),
            self._build_sdpa(f"{attn_id}.sdpa", c.head_dim),
            self._build_linear(f"{attn_id}.o", "O proj", q_out, c.hidden_size, o_params),
        ]
        total = gqa_attention_params(
            c.hidden_size, c.head_dim, c.num_attention_heads, c.num_key_value_heads
        )
        return (
            BlockBuilder(attn_id, "self_attention")
            .label("Self-attention")
            .meta(f"GQA · {c.num_attention_heads} Q / {c.num_key_value_heads} KV heads")
            .params(
                num_heads=c.num_attention_heads,
                num_kv_heads=c.num_key_value_heads,
                head_dim=c.head_dim,
                hidden_size=c.hidden_size,
            )
            .param_count(total)
            .children(children)
            .shapes(input=f"[B, T, {c.hidden_size}]", output=f"[B, T, {c.hidden_size}]")
            .build()
        )

    def _build_linear(
        self,
        node_id: str,
        label: str,
        in_features: int,
        out_features: int,
        param_count: int,
    ) -> Node:
        return (
            BlockBuilder(node_id, "linear")
            .label(label)
            .params(in_features=in_features, out_features=out_features, bias=False)
            .param_count(param_count)
            .shapes(
                input=f"[B, T, {in_features}]",
                output=f"[B, T, {out_features}]",
            )
            .build()
        )

    def _build_sdpa(self, node_id: str, head_dim: int) -> Node:
        return (
            BlockBuilder(node_id, "sdpa")
            .label("Scaled dot-product attention")
            .meta(f"softmax(QKᵀ/√{head_dim}) · V")
            .params(head_dim=head_dim)
            .param_count(0)
            .build()
        )

    def _build_ffn(self, node_id: str, c: ModelConfig) -> Node:
        return (
            BlockBuilder(node_id, "feed_forward")
            .label("Feed-forward")
            .meta(f"SwiGLU · d_ff {c.intermediate_size}")
            .params(
                hidden_size=c.hidden_size,
                ffn_size=c.intermediate_size,
                activation="silu",
            )
            .param_count(swiglu_mlp_params(c.hidden_size, c.intermediate_size))
            .shapes(input=f"[B, T, {c.hidden_size}]", output=f"[B, T, {c.hidden_size}]")
            .build()
        )

    def _build_rmsnorm(self, node_id: str, hidden_size: int, where: str) -> Node:
        return (
            BlockBuilder(node_id, "rms_norm")
            .label("RMSNorm")
            .meta(where)
            .params(dim=hidden_size)
            .param_count(rmsnorm_params(hidden_size))
            .build()
        )

    def _build_residual(self, node_id: str) -> Node:
        return (
            BlockBuilder(node_id, "residual_add")
            .label("+ residual")
            .param_count(0)
            .build()
        )

    def _build_final_norm(self, c: ModelConfig) -> Node:
        return (
            BlockBuilder("final_norm", "rms_norm")
            .label("Final RMSNorm")
            .params(dim=c.hidden_size)
            .param_count(rmsnorm_params(c.hidden_size))
            .build()
        )

    def _build_lm_head(self, c: ModelConfig) -> Node:
        return (
            BlockBuilder("lm_head", "lm_head")
            .label("Output layer")
            .meta("logits → probabilities" + (" · tied" if c.tie_word_embeddings else ""))
            .params(
                in_features=c.hidden_size,
                out_features=c.vocab_size,
                tied=c.tie_word_embeddings,
            )
            .param_count(lm_head_params(c.hidden_size, c.vocab_size, c.tie_word_embeddings))
            .shapes(input=f"[B, T, {c.hidden_size}]", output=f"[B, T, {c.vocab_size}]")
            .build()
        )

    def _summarize(self, c: ModelConfig) -> dict[str, int | bool]:
        return {
            "hidden_size": c.hidden_size,
            "num_hidden_layers": c.num_hidden_layers,
            "num_attention_heads": c.num_attention_heads,
            "num_key_value_heads": c.num_key_value_heads,
            "head_dim": c.head_dim,
            "intermediate_size": c.intermediate_size,
            "vocab_size": c.vocab_size,
            "tie_word_embeddings": c.tie_word_embeddings,
        }
