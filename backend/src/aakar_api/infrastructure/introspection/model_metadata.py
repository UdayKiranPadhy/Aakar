"""Spec-level metadata extracted from a config and an instantiated model."""

from __future__ import annotations

from typing import Any

from torch import nn

_CONFIG_SUMMARY_KEYS = (
    "model_type",
    "hidden_size",
    "num_hidden_layers",
    "num_attention_heads",
    "num_key_value_heads",
    "head_dim",
    "intermediate_size",
    "vocab_size",
    "max_position_embeddings",
    "tie_word_embeddings",
    "torch_dtype",
    "rope_theta",
    "hidden_act",
    "sliding_window",
    "bos_token_id",
    "eos_token_id",
    "pad_token_id",
    "num_local_experts",
    "num_experts_per_tok",
)


def config_summary(config: Any, total_params: int) -> dict[str, Any]:
    summary: dict[str, Any] = {"total_params": total_params}
    for key in _CONFIG_SUMMARY_KEYS:
        value = getattr(config, key, None)
        if value is None:
            continue
        if not isinstance(value, int | float | bool | str):
            value = str(value)
        summary[key] = value

    _add_gqa_ratio(config, summary)
    _add_quantization_config(config, summary)
    return summary


def attention_implementation(model: nn.Module, config: Any) -> str | None:
    implementation = getattr(config, "_attn_implementation", None)
    if isinstance(implementation, str) and implementation:
        return implementation

    for module in model.modules():
        class_name = type(module).__name__
        if class_name.endswith("FlashAttention2"):
            return "flash_attention_2"
        if "Sdpa" in class_name and "Attention" in class_name:
            return "sdpa"
    return "eager"


def position_encoding(model: nn.Module, config: Any) -> str | None:
    if getattr(config, "rope_theta", None) is not None:
        return "rope"
    if getattr(config, "rope_scaling", None) is not None:
        return "rope"

    for module in model.modules():
        class_name = type(module).__name__
        if "Rotary" in class_name:
            return "rope"
        if "ALiBi" in class_name or "Alibi" in class_name:
            return "alibi"

    for name, _ in model.named_modules():
        if name.endswith(".wpe") or name == "wpe":
            return "learned"
    return None


def tied_word_embeddings(model: nn.Module, config: Any) -> bool | None:
    config_value = getattr(config, "tie_word_embeddings", None)
    config_tied = config_value if isinstance(config_value, bool) else None
    try:
        input_embeddings = model.get_input_embeddings()
        output_embeddings = model.get_output_embeddings()
    except (AttributeError, NotImplementedError):
        return config_tied

    if input_embeddings is None or output_embeddings is None:
        return config_tied
    if input_embeddings.weight is output_embeddings.weight:
        return True
    return config_tied if config_tied is not None else False


def _add_gqa_ratio(config: Any, summary: dict[str, Any]) -> None:
    num_heads = getattr(config, "num_attention_heads", None)
    num_kv_heads = getattr(config, "num_key_value_heads", None)
    if isinstance(num_heads, int) and isinstance(num_kv_heads, int) and num_kv_heads > 0:
        summary["gqa_ratio"] = num_heads // num_kv_heads


def _add_quantization_config(config: Any, summary: dict[str, Any]) -> None:
    quantization_config = getattr(config, "quantization_config", None)
    if quantization_config is None:
        return

    if hasattr(quantization_config, "to_dict"):
        try:
            summary["quantization_config"] = quantization_config.to_dict()
        except Exception:
            summary["quantization_config"] = str(quantization_config)
    elif isinstance(quantization_config, dict):
        summary["quantization_config"] = quantization_config
    else:
        summary["quantization_config"] = str(quantization_config)

