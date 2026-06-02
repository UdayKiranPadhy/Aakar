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
from aakar_api.infrastructure.introspection.naming import humanize, snake_case
from aakar_api.infrastructure.introspection.node_metadata import intermediates
from aakar_api.infrastructure.introspection.spec_builder import build_spec
from aakar_api.infrastructure.introspection.walk_context import WalkContext

# Module-level aliases kept for the unit tests that import these helpers through
# this module (see tests/unit/test_introspector.py).
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
        return build_spec(model_id, config, architecture_name, model)

    @staticmethod
    def _load_config(model_id: str) -> Any:
        return load_config(model_id)

    _intermediates = staticmethod(intermediates)
