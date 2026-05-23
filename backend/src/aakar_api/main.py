"""FastAPI composition root.

This module is the *only* place that imports from every layer. It wires the
introspector + spec cache into an `ArchitectureService`, stashes it on
`app.state`, registers routes, configures CORS, and installs domain → HTTP
error handlers.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from aakar_api.api import configure_cors, register_error_handlers, router
from aakar_api.application import ArchitectureService
from aakar_api.infrastructure import DiskSpecCache, TransformersIntrospector

_DEFAULT_CACHE_ROOT = Path(__file__).resolve().parents[2] / ".cache" / "specs"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    introspector = TransformersIntrospector()
    cache = DiskSpecCache(root=_DEFAULT_CACHE_ROOT)
    app.state.architecture_service = ArchitectureService(introspector, cache)
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Aakar API",
        version="0.2.0",
        description=(
            "LLM architecture visualizer — introspects HF transformers models "
            "on the meta device and emits a composition spec."
        ),
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )
    configure_cors(app)
    register_error_handlers(app)
    app.include_router(router)
    return app


app = create_app()
