"""Compose two `SpecCache`s into a fast-tier-first chain.

A decorator over two `SpecCache`s, in the same spirit as `FallbackIntrospector`:

  * **primary** — the fast, local tier (disk). Read first; warm reads stay local.
  * **secondary** — the durable, shared tier (Redis). Read only on a primary miss;
    a secondary hit backfills the primary so the next read skips the network.

Writes go write-through to both. Putting the local disk *in front* of Redis means
warm reads never pay a network round-trip and we issue far fewer commands against
a capped Redis plan, while every build is still shared + persisted through the
durable tier. Both members are independently fail-open, so a dead Redis just makes
this behave like the disk cache alone.
"""

from __future__ import annotations

from aakar_api.application.interfaces import SpecCache
from aakar_api.domain.spec import Spec


class TieredSpecCache:
    """Two-tier `SpecCache`: a fast primary in front of a durable secondary."""

    def __init__(self, primary: SpecCache, secondary: SpecCache) -> None:
        self._primary = primary
        self._secondary = secondary

    async def get(self, model_id: str) -> Spec | None:
        hit = await self._primary.get(model_id)
        if hit is not None:
            return hit
        hit = await self._secondary.get(model_id)
        if hit is not None:
            # Warm the fast tier so the next read for this entry stays local.
            await self._primary.set(model_id, hit)
        return hit

    async def set(self, model_id: str, spec: Spec) -> None:
        await self._primary.set(model_id, spec)
        await self._secondary.set(model_id, spec)
