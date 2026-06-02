"""Map domain exceptions to HTTP responses.

Centralizing this here keeps the application/service layer free of HTTP
concerns and lets tests assert on the typed exception instead of the status
code.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import ORJSONResponse

from aakar_api.domain.exceptions import (
    HubUnavailable,
    IntrospectionFailed,
    IntrospectionTimeout,
    ModelGated,
    ModelNotFound,
    UnsupportedArchitecture,
)

# Status codes are the contract: the frontend renders error pages off the HTTP
# status, not a body string. Each error condition therefore gets a *distinct*
# status. Request-validation is forced to 400 (below) so 422 is reserved
# exclusively for `unsupported_architecture`.


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _request_validation(
        _: Request, exc: RequestValidationError
    ) -> ORJSONResponse:
        # FastAPI defaults request-validation to 422, which collides with
        # UnsupportedArchitecture. Remap to 400 so the status is unambiguous.
        return ORJSONResponse(
            status_code=400,
            content={
                "kind": "bad_request",
                "message": "Invalid request — check the model id and try again.",
            },
        )

    @app.exception_handler(ModelNotFound)
    async def _model_not_found(_: Request, exc: ModelNotFound) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=404,
            content={
                "kind": "model_not_found",
                "message": str(exc),
                "model_id": exc.model_id,
            },
        )

    @app.exception_handler(ModelGated)
    async def _model_gated(_: Request, exc: ModelGated) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=403,
            content={
                "kind": "model_gated",
                "message": str(exc),
                "model_id": exc.model_id,
            },
        )

    @app.exception_handler(UnsupportedArchitecture)
    async def _unsupported_architecture(
        _: Request, exc: UnsupportedArchitecture
    ) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=422,
            content={
                "kind": "unsupported_architecture",
                "message": str(exc),
                "model_id": exc.model_id,
                "architecture": exc.architecture,
            },
        )

    @app.exception_handler(IntrospectionTimeout)
    async def _introspection_timeout(
        _: Request, exc: IntrospectionTimeout
    ) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=504,
            content={
                "kind": "introspection_timeout",
                "message": str(exc),
                "model_id": exc.model_id,
            },
        )

    @app.exception_handler(IntrospectionFailed)
    async def _introspection_failed(
        _: Request, exc: IntrospectionFailed
    ) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=502,
            content={
                "kind": "introspection_failed",
                "message": str(exc),
                "model_id": exc.model_id,
            },
        )

    @app.exception_handler(HubUnavailable)
    async def _hub_unavailable(_: Request, exc: HubUnavailable) -> ORJSONResponse:
        return ORJSONResponse(
            status_code=503,
            content={
                "kind": "hub_unavailable",
                "message": str(exc),
                "model_id": exc.model_id,
            },
        )
