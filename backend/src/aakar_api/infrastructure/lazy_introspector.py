"""An `Introspector` decorator that builds its delegate on first use.

Why this exists: `ArchitectureService` / `OperationsService` consult the cache *before*
they ever touch the introspector, so a request served from cache should cost nothing.
But the real introspector pulls in torch + transformers the moment its module is
imported — and if a service held one as a plain constructor dependency, that import
would happen when the service is *built* (on the first request), even when that request
is a cache hit. Wrapping it lazily defers the heavy import until an actual cache miss
needs to introspect.

`build` is invoked at most once and memoized. `_resolve()` is synchronous and runs
inside the async methods before any `await`, so within the event loop it executes
atomically — two interleaved cache-miss requests can't both build, and no lock is needed.
"""

from __future__ import annotations

from collections.abc import Callable

from aakar_api.application.interfaces import Introspector
from aakar_api.domain.spec import Spec


class LazyIntrospector:
    """Defer building (and importing) the real introspector until it is actually used."""

    def __init__(self, build: Callable[[], Introspector]) -> None:
        self._build = build
        self._delegate: Introspector | None = None

    def _resolve(self) -> Introspector:
        if self._delegate is None:
            self._delegate = self._build()
        return self._delegate

    async def introspect(self, model_id: str, *, token: str | None = None) -> Spec:
        return await self._resolve().introspect(model_id, token=token)

    async def introspect_with_operations(
        self, model_id: str, *, token: str | None = None
    ) -> Spec:
        return await self._resolve().introspect_with_operations(model_id, token=token)
