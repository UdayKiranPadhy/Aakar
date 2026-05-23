"""Application service — orchestrates one architecture request end-to-end.

`ArchitectureService` is the only place the system composes a fetch + an
adapter dispatch. It depends on abstractions (`ConfigRepository`,
`AdapterRegistry`) so it is trivial to test with fakes — no HTTP, no FastAPI.
"""

from __future__ import annotations

from aakar_api.adapters.registry import AdapterRegistry
from aakar_api.application.interfaces import ConfigRepository
from aakar_api.domain.spec import Spec


class ArchitectureService:
    """Pure orchestration: fetch config, resolve adapter, build Spec."""

    def __init__(
        self,
        config_repo: ConfigRepository,
        adapter_registry: AdapterRegistry,
    ) -> None:
        self._config_repo = config_repo
        self._adapter_registry = adapter_registry

    async def get_architecture(self, model_id: str) -> Spec:
        config = await self._config_repo.fetch(model_id)
        adapter = self._adapter_registry.resolve(config.model_type)
        return adapter.build(config, model_id)
