"""Public introspector implementation backed by stock `transformers`.

The class is intentionally thin: it owns the async boundary and orchestration,
while focused infrastructure helpers handle config loading, model construction,
tree walking, and metadata extraction.

Two builds share one code path, differing only in whether the fake-tensor forward
trace runs: `introspect` (structure only, fast — `/architecture`) and
`introspect_with_operations` (structure + per-module ops — `/operations`).
"""

from __future__ import annotations

import asyncio
from typing import Any

from aakar_api.domain.spec import Spec
from aakar_api.infrastructure.introspection.config_loader import load_config
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

    async def introspect(self, model_id: str, *, token: str | None = None) -> Spec:
        return await asyncio.to_thread(self._introspect_sync, model_id, token, False)

    async def introspect_with_operations(
        self, model_id: str, *, token: str | None = None
    ) -> Spec:
        return await asyncio.to_thread(self._introspect_sync, model_id, token, True)

    def _introspect_sync(
        self, model_id: str, token: str | None, include_operations: bool
    ) -> Spec:
        config = self._load_config(model_id, token)
        architecture_name, model_factory = resolve_model_class(config, model_id)
        model = build_model_on_meta_device(config, model_factory)
        return build_spec(
            model_id,
            config,
            architecture_name,
            model,
            include_operations=include_operations,
        )

    @staticmethod
    def _load_config(model_id: str, token: str | None = None) -> Any:
        return load_config(model_id, token=token)

    _intermediates = staticmethod(intermediates)
