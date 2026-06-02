"""API layer — FastAPI routes, error handlers, CORS.

Routes resolve their services through the Lagom container in `aakar_api.di`;
that module (not this one) is where concrete implementations are wired into the
abstractions the application layer depends on.
"""

from aakar_api.api.cors import configure_cors
from aakar_api.api.errors import register_error_handlers
from aakar_api.api.routes import router
from aakar_api.api.server_errors import install_unhandled_error_handler

__all__ = [
    "configure_cors",
    "install_unhandled_error_handler",
    "register_error_handlers",
    "router",
]
