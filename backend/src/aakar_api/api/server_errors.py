"""Turn unhandled exceptions into a CORS-friendly JSON 500.

Starlette's built-in `ServerErrorMiddleware` sits *outside* `CORSMiddleware`, so
an unhandled exception produces a 500 with **no** `Access-Control-Allow-Origin`
header. The browser then blocks that response from JavaScript and `fetch`
reports a network failure rather than a 500 — so the frontend can't tell a real
server error apart from "the server is unreachable".

This middleware catches unhandled exceptions and returns a JSON 500 from
*inside* the CORS layer, so the response carries CORS headers and the frontend
renders its server-error page. It must be installed BEFORE CORS so CORS wraps it
(see `main.py`). Handled domain errors keep flowing through their registered
exception handlers untouched.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("aakar_api")


class UnhandledErrorMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            return await call_next(request)
        except Exception:  # noqa: BLE001 — last-resort net for unexpected errors
            logger.exception(
                "Unhandled error on %s %s", request.method, request.url.path
            )
            return ORJSONResponse(
                status_code=500,
                content={
                    "kind": "server_error",
                    "message": "An unexpected error occurred while building the graph.",
                },
            )


def install_unhandled_error_handler(app: FastAPI) -> None:
    """Install the catch-all 500 middleware. Call BEFORE `configure_cors`."""
    app.add_middleware(UnhandledErrorMiddleware)
