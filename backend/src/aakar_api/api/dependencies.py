"""DI composition root.

Each `Depends`-able factory below either returns a per-process singleton
(`@lru_cache`) or wires a concrete infrastructure implementation into the
abstraction the application layer expects. Tests override these via
`app.dependency_overrides` to inject fakes.
"""

from __future__ import annotations

from functools import lru_cache

import httpx
from fastapi import Depends, Request

from aakar_api.adapters import AdapterRegistry, build_default_registry
from aakar_api.application import ArchitectureService, ConfigRepository
from aakar_api.infrastructure import HFConfigRepository


def get_http_client(request: Request) -> httpx.AsyncClient:
    """Return the process-wide async HTTP client set by the lifespan hook."""
    return request.app.state.http_client


def get_config_repository(
    http: httpx.AsyncClient = Depends(get_http_client),
) -> ConfigRepository:
    return HFConfigRepository(http)


@lru_cache(maxsize=1)
def get_adapter_registry() -> AdapterRegistry:
    return build_default_registry()


def get_architecture_service(
    repo: ConfigRepository = Depends(get_config_repository),
    registry: AdapterRegistry = Depends(get_adapter_registry),
) -> ArchitectureService:
    return ArchitectureService(repo, registry)
