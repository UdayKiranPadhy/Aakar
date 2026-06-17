from __future__ import annotations

import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from aakar_api.api import (
    configure_cors,
    install_unhandled_error_handler,
    register_error_handlers,
    router,
)


def _warm_introspection() -> None:
    """Pull the heavy torch + transformers import in *off* the request path.

    The introspector's modules are imported lazily (see `di._build_introspector`), so
    starting the API is torch-free and the Hub-metadata endpoints never wait on the ML
    stack. To keep the first /architecture request snappy too, we trigger that import
    here in a background thread once the server is already live — it overlaps with
    serving the lightweight endpoints instead of blocking the first introspection.
    """
    try:
        import aakar_api.infrastructure.transformers_introspector  # noqa: F401
    except Exception:  # noqa: BLE001 — warming is best-effort; it must never crash the app
        pass


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Kick the torch/transformers import off in the background as the server comes up.
    threading.Thread(
        target=_warm_introspection, name="warm-introspection", daemon=True
    ).start()
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
        lifespan=_lifespan,
    )
    # Order matters: install the catch-all 500 handler FIRST so that CORS
    # (added next) wraps it — an unhandled-exception 500 then carries CORS
    # headers and the browser delivers it to the frontend.
    install_unhandled_error_handler(app)
    configure_cors(app)
    register_error_handlers(app)
    app.include_router(router)
    return app


app = create_app()
