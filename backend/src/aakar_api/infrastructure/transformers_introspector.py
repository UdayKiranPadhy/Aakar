"""Public introspector implementation backed by stock `transformers`.

The class is intentionally thin: it owns the async boundary and orchestration,
while focused infrastructure helpers handle config loading, model construction,
tree walking, and metadata extraction.
"""

from __future__ import annotations

import asyncio
from typing import Any

from aakar_api.domain.spec import Spec
from aakar_api.infrastructure.introspection.config_loader import config_hash, load_config
from aakar_api.infrastructure.introspection.model_builder import (
    build_model_on_meta_device,
    resolve_model_class,
)
from aakar_api.infrastructure.introspection.model_metadata import (
    attention_implementation,
    config_summary,
    position_encoding,
    tied_word_embeddings,
)
from aakar_api.infrastructure.introspection.naming import humanize, snake_case
from aakar_api.infrastructure.introspection.node_metadata import intermediates
from aakar_api.infrastructure.introspection.node_walker import walk_module_tree
from aakar_api.infrastructure.introspection.walk_context import (
    WalkContext,
    clean_dtype,
    walk_context_from_config,
)

_humanize = humanize
_intermediates = intermediates
_snake_case = snake_case
_WalkCtx = WalkContext


class TransformersIntrospector:
    """Build Specs by walking the real transformers nn.Module tree on meta."""

    async def introspect(self, model_id: str) -> Spec:
        return await asyncio.to_thread(self._introspect_sync, model_id)

    async def fetch_config_hash(self, model_id: str) -> str:
        return await asyncio.to_thread(self._fetch_config_hash_sync, model_id)

    def _fetch_config_hash_sync(self, model_id: str) -> str:
        return config_hash(self._load_config(model_id))

    def _introspect_sync(self, model_id: str) -> Spec:
        config = self._load_config(model_id)
        architecture_name, model_factory = resolve_model_class(config, model_id)
        model = build_model_on_meta_device(config, model_factory)

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
            attn_impl=attention_implementation(model, config),
            position_encoding=position_encoding(model, config),
            tied_word_embeddings=tied_word_embeddings(model, config),
            flops_reference={
                "batch_size": walk_context.batch_ref,
                "seq_len": walk_context.seq_ref,
            },
        )

    @staticmethod
    def _load_config(model_id: str) -> Any:
        return load_config(model_id)

    _intermediates = staticmethod(intermediates)
