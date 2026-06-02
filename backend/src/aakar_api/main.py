from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from aakar_api.api import (
    configure_cors,
    install_unhandled_error_handler,
    register_error_handlers,
    router,
)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Aakar API",
        version="0.2.0",
        description=(
            "LLM architecture visualizer — introspects HF transformers models "
            "on the meta device and emits a composition spec."
        ),
        default_response_class=ORJSONResponse,
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
