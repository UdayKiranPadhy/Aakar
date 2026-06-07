"""Assemble a `Spec` from an already-built model + config.

Extracted from `TransformersIntrospector` so the in-process introspector and the
sandboxed worker emit byte-identical Specs from the same tree walk. The only
thing that differs between them is *how* the `config`/`model` are obtained
(stock + `trust_remote_code=False` in-process, vs. custom code inside the
sandbox) — the assembly below is shared.
"""

from __future__ import annotations

from typing import Any

from torch import nn

from aakar_api.domain.spec import Spec
from aakar_api.infrastructure.introspection.model_metadata import (
    attention_implementation,
    config_summary,
    position_encoding,
    tied_word_embeddings,
)
from aakar_api.infrastructure.introspection.node_walker import walk_module_tree
from aakar_api.infrastructure.introspection.walk_context import (
    clean_dtype,
    walk_context_from_config,
)


def build_spec(
    model_id: str,
    config: Any,
    architecture_name: str,
    model: nn.Module,
) -> Spec:
    """Walk `model` and pack the result + config metadata into a `Spec`."""
    param_dtype = clean_dtype(getattr(config, "torch_dtype", None))
    walk_context = walk_context_from_config(config, param_dtype)
    root = walk_module_tree(
        model,
        path="",
        label_segment=architecture_name,
        ctx=walk_context,
    )

    return Spec(
        model_id=model_id,
        model_type=getattr(config, "model_type", "unknown"),
        config_summary=config_summary(config, root.param_count or 0),
        graph=[root],
        param_dtype=param_dtype,
        attn_impl=attention_implementation(config),
        position_encoding=position_encoding(model, config),
        tied_word_embeddings=tied_word_embeddings(model, config),
        flops_reference={
            "batch_size": walk_context.batch_ref,
            "seq_len": walk_context.seq_ref,
        },
        config_full=config.to_dict(),
    )
