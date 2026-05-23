"""Abstract interfaces the application layer depends on.

Per DIP, the application layer declares the shape it needs and infrastructure
implements it. Using `typing.Protocol` (structural typing) instead of `abc.ABC`
keeps fakes trivial — any class with the right methods satisfies the contract,
no inheritance required.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from aakar_api.domain.spec import Spec


@runtime_checkable
class Introspector(Protocol):
    """Builds a Spec for a HuggingFace model ID.

    Implementations may walk the real `transformers` nn.Module tree (production)
    or return canned specs (tests). Both methods are async because the production
    impl wraps blocking work in `asyncio.to_thread`.
    """

    async def introspect(self, model_id: str) -> Spec: ...

    async def fetch_config_hash(self, model_id: str) -> str: ...


@runtime_checkable
class SpecCache(Protocol):
    """Reads/writes `Spec` objects keyed by (model_id, config_hash)."""

    async def get(self, model_id: str, config_hash: str) -> Spec | None: ...

    async def set(self, model_id: str, config_hash: str, spec: Spec) -> None: ...
