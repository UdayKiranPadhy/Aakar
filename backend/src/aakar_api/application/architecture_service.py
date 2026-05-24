"""Application service — orchestrates one architecture request end-to-end.

`ArchitectureService` is the only place the system composes a cache lookup +
a transformers introspection. It depends on abstractions (`Introspector`,
`SpecCache`) so it is trivial to test with fakes — no transformers, no FastAPI.
"""

from __future__ import annotations

from aakar_api.application.interfaces import Introspector, SpecCache
from aakar_api.domain.spec import Spec


class ArchitectureService:
    """Pure orchestration: cache-check, introspect on miss, write-through."""

    def __init__(self, introspector: Introspector, cache: SpecCache) -> None:
        self._introspector = introspector
        self._cache = cache

    async def get_architecture(self, model_id: str) -> Spec:
        config_hash = await self._introspector.fetch_config_hash(model_id)
        cached = await self._cache.get(model_id, config_hash)
        if cached is not None:
            return cached

        spec = await self._introspector.introspect(model_id)
        await self._cache.set(model_id, config_hash, spec)
        return spec
