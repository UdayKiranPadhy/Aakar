"""Typed value object wrapping a HuggingFace `config.json` dict.

This is the **only** place in the codebase that knows HuggingFace field names.
Adapters consume `ModelConfig` via typed properties, not raw dicts — so renaming
or remapping a HF field is a one-file change.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ModelConfig:
    """Immutable view over a raw HF config dict."""

    raw: dict[str, Any]

    @property
    def model_type(self) -> str:
        return str(self.raw.get("model_type", ""))

    @property
    def hidden_size(self) -> int:
        return int(self.raw["hidden_size"])

    @property
    def num_hidden_layers(self) -> int:
        return int(self.raw["num_hidden_layers"])

    @property
    def num_attention_heads(self) -> int:
        return int(self.raw["num_attention_heads"])

    @property
    def num_key_value_heads(self) -> int:
        # Pre-GQA models (Llama-1/2, Mistral-7B-v0.1) omit this; fall back to MHA.
        return int(self.raw.get("num_key_value_heads", self.num_attention_heads))

    @property
    def head_dim(self) -> int:
        # Llama-3 and Qwen3 set head_dim explicitly; older models derive it.
        return int(self.raw.get("head_dim", self.hidden_size // self.num_attention_heads))

    @property
    def intermediate_size(self) -> int:
        return int(self.raw["intermediate_size"])

    @property
    def vocab_size(self) -> int:
        return int(self.raw["vocab_size"])

    @property
    def tie_word_embeddings(self) -> bool:
        # Llama unties; Qwen2 ties on the small variants.
        return bool(self.raw.get("tie_word_embeddings", False))
