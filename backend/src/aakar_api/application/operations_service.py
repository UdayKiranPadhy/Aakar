"""Application service — the lazy per-module forward-pass operations for one model.

Split out of `ArchitectureService` so the expensive fake-tensor trace stays off the
`/architecture` critical path: the frontend renders the module tree immediately, then
fetches operations in the background. It shares the same `SpecCache` as the architecture
service, so a model's cache entry is *upgraded in place* from structure-only to
fully-traced the first time operations are requested — after that both `/architecture`
and `/operations` reads are warm.
"""

from __future__ import annotations

from aakar_api.application.interfaces import Introspector, SpecCache
from aakar_api.domain.spec import Spec


class OperationsService:
    """Cache-check by id, run the forward-pass trace on a miss, write-through."""

    def __init__(self, introspector: Introspector, cache: SpecCache) -> None:
        self._introspector = introspector
        self._cache = cache

    async def get_operations(self, model_id: str, *, token: str | None = None) -> Spec:
        cached = await self._cache.get(model_id)
        # `operations_traced` (not "has any ops") is the gate: a model that legitimately
        # traces to zero ops is cached as done, not recomputed on every request. A
        # structure-only entry written by /architecture has this False, so we trace.
        if cached is not None and cached.operations_traced:
            return cached

        spec = await self._introspector.introspect_with_operations(model_id, token=token)
        await self._cache.set(model_id, spec)
        return spec
