"""Cross-cutting building blocks shared by adapters: BlockBuilder + parameter formulas."""

from aakar_api.adapters.building.block_builder import BlockBuilder
from aakar_api.adapters.building.param_formulas import (
    embedding_params,
    gqa_attention_params,
    linear_params,
    lm_head_params,
    rmsnorm_params,
    swiglu_mlp_params,
)

__all__ = [
    "BlockBuilder",
    "embedding_params",
    "gqa_attention_params",
    "linear_params",
    "lm_head_params",
    "rmsnorm_params",
    "swiglu_mlp_params",
]
