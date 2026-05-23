"""Domain-level exceptions.

Raised by the infrastructure layer (e.g., `HFConfigRepository`) and mapped to
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


class ConfigFetchTimeout(AakarDomainError):
    """The HF Hub did not respond within the configured timeout."""

    def __init__(self, model_id: str) -> None:
        super().__init__(f"Timed out fetching config for {model_id!r}")
        self.model_id = model_id


class UnsupportedConfig(AakarDomainError):
    """The fetched config is missing fields required by every adapter."""

    def __init__(self, model_id: str, missing_field: str) -> None:
        super().__init__(
            f"Config for {model_id!r} is missing required field {missing_field!r}"
        )
        self.model_id = model_id
        self.missing_field = missing_field
