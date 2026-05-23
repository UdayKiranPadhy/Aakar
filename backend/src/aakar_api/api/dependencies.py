"""DI composition root.

The `ArchitectureService` (and its introspector + cache deps) is constructed
once at app startup by the lifespan hook and stashed on `app.state`. Tests
override `get_architecture_service` via `app.dependency_overrides` to inject
fakes.
"""

from __future__ import annotations

from fastapi import Request

from aakar_api.application import ArchitectureService


def get_architecture_service(request: Request) -> ArchitectureService:
    service: ArchitectureService = request.app.state.architecture_service
    return service
