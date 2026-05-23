"""Abstract interfaces the application layer depends on.

Per DIP, the application layer declares the shape it needs and infrastructure
implements it. Using `typing.Protocol` (structural typing) instead of `abc.ABC`
keeps fakes trivial — any class with the right methods satisfies the contract,
no inheritance required.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from aakar_api.domain.model_config import ModelConfig


@runtime_checkable
class ConfigRepository(Protocol):
    """Fetches a `ModelConfig` for a given HuggingFace model ID.

    Implementations may hit the live HF Hub, read from disk, or return a
    canned dict in tests. They are expected to raise the relevant domain
    exception (`ModelNotFound`, `ModelGated`, `ConfigFetchTimeout`) for
    well-known failures.
    """

    async def fetch(self, model_id: str) -> ModelConfig: ...
