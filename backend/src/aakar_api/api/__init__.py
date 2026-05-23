"""API layer — FastAPI routes, DI factories, error handlers, CORS.

Knows about every other layer; wires concrete implementations into the
abstractions the application layer depends on.
"""

from aakar_api.api.cors import configure_cors
from aakar_api.api.errors import register_error_handlers
from aakar_api.api.routes import router

__all__ = ["configure_cors", "register_error_handlers", "router"]
