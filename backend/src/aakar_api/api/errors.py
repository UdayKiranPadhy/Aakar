"""Map domain exceptions to HTTP responses.

Centralizing this here keeps the application/service layer free of HTTP
concerns and lets tests assert on the typed exception instead of the status
code.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import ORJSONResponse

from aakar_api.domain.exceptions import (
    ConfigFetchTimeout,
    ModelGated,
    ModelNotFound,
    UnsupportedConfig,
)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ModelNotFound)
    async def _model_not_found(_: Request, exc: ModelNotFound) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=404,
            content={"error": "model_not_found", "message": str(exc), "model_id": exc.model_id},
        )

    @app.exception_handler(ModelGated)
    async def _model_gated(_: Request, exc: ModelGated) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=403,
            content={"error": "model_gated", "message": str(exc), "model_id": exc.model_id},
        )

    @app.exception_handler(ConfigFetchTimeout)
    async def _config_timeout(_: Request, exc: ConfigFetchTimeout) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=504,
            content={"error": "upstream_timeout", "message": str(exc), "model_id": exc.model_id},
        )

    @app.exception_handler(UnsupportedConfig)
    async def _unsupported_config(_: Request, exc: UnsupportedConfig) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=422,
            content={
                "error": "unsupported_config",
                "message": str(exc),
                "model_id": exc.model_id,
                "missing_field": exc.missing_field,
            },
        )
