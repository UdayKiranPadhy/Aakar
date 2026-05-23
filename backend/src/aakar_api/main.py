"""FastAPI composition root.

This module is the *only* place that imports from every layer. It wires
HTTP infrastructure (httpx client lifecycle) into the dependency graph,
registers routes, configures CORS, and installs domain → HTTP error handlers.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import httpx
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from aakar_api.api import configure_cors, register_error_handlers, router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # One AsyncClient per process — connection pooling + HTTP/2 reuse.
    async with httpx.AsyncClient(http2=False) as client:
        app.state.http_client = client
        yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Aakar API",
        version="0.1.0",
        description="LLM architecture visualizer — fetches HF model configs and emits a composition spec.",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )
    configure_cors(app)
    register_error_handlers(app)
    app.include_router(router)
    return app


app = create_app()
