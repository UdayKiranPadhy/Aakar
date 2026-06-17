"""Application service — orchestrates one architecture request end-to-end.

`ArchitectureService` is the only place the system composes a cache lookup +
a transformers introspection. It depends on abstractions (`Introspector`,
`SpecCache`) so it is trivial to test with fakes — no transformers, no FastAPI.
"""

from __future__ import annotations

from aakar_api.application.interfaces import Introspector, SpecCache
from aakar_api.domain.spec import Spec


class ArchitectureService:
    """Pure orchestration: cache-check by id, introspect the structure on a miss."""

    def __init__(self, introspector: Introspector, cache: SpecCache) -> None:
        self._introspector = introspector
        self._cache = cache

    async def get_architecture(self, model_id: str, *, token: str | None = None) -> Spec:
        # Keyed by model id alone, so a warm hit returns with no Hub round-trip. A
        # cached *full* Spec (one the operations endpoint upgraded in place) is fine to
        # serve as-is — the structure view simply ignores the extra `operations`.
        cached = await self._cache.get(model_id)
        if cached is not None:
            return cached

        spec = await self._introspector.introspect(model_id, token=token)
        await self._cache.set(model_id, spec)
        return spec
