"""Domain-level exceptions.

Raised by the infrastructure layer (e.g., `TransformersIntrospector`) and mapped to
HTTP responses by the API layer. The application layer propagates them
untouched — keeping the service free of HTTP concerns.
"""

from __future__ import annotations


class AakarDomainError(Exception):
    """Base class for all domain-level errors."""


class ModelNotFound(AakarDomainError):
    """The model ID does not exist on the Hub or has no `config.json`."""

    def __init__(self, model_id: str) -> None:
        super().__init__(f"Model not found or config.json missing: {model_id!r}")
        self.model_id = model_id


class ModelGated(AakarDomainError):
    """The model is private or gated; Aakar has no token to access it."""

    def __init__(self, model_id: str) -> None:
        super().__init__(f"Model is gated or private: {model_id!r}")
        self.model_id = model_id


class UnsupportedArchitecture(AakarDomainError):
    """The model's architecture can't be loaded by Aakar.

    Two distinct triggers:
      - The repo requires `trust_remote_code=True` (custom Python). Refused
        on principle; we will not execute arbitrary code from HF repos.
      - The config's `model_type` is unknown to our pinned `transformers`
        version (i.e. the model is newer than the dep). Remedy is to bump
        the pin in `backend/pyproject.toml`.
    """

    def __init__(self, model_id: str, architecture: str | None) -> None:
        arch = architecture or "unknown"
        msg = (
            f"Model {model_id!r} uses an architecture ({arch}) that Aakar "
            "can't load. Either the repo requires trust_remote_code=True "
            "(refused for safety), or the installed transformers version is "
            "too old to recognize it."
        )
        super().__init__(msg)
        self.model_id = model_id
        self.architecture = architecture
