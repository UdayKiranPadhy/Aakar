"""CORS configuration driven by the CORS_ORIGINS env var.

Comma-separated list. Defaults to localhost:5173 for local dev convenience.
In production, set to your deployed frontend's origin.
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

_DEFAULT_ORIGINS = "http://localhost:5173"


def configure_cors(app: FastAPI) -> None:
    raw = os.environ.get("CORS_ORIGINS", _DEFAULT_ORIGINS)
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["*"],
    )
