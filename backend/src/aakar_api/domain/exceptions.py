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


class IntrospectionFailed(AakarDomainError):
    """The sandbox ran but couldn't produce a Spec for a remote-code model.

    The model's custom code errored, didn't honor the meta device, needed a
    missing dependency, or crashed the worker. Distinct from
    `UnsupportedArchitecture` (which is "we refuse / can't recognize it") — here
    we tried in the sandbox and it genuinely failed.
    """

    def __init__(self, model_id: str, detail: str | None = None) -> None:
        msg = f"Introspection failed for {model_id!r}"
        if detail:
            msg = f"{msg}: {detail}"
        super().__init__(msg)
        self.model_id = model_id
        self.detail = detail


class IntrospectionTimeout(AakarDomainError):
    """The sandboxed introspection exceeded its wall-clock budget and was killed."""

    def __init__(self, model_id: str, *, timeout_s: float | None = None) -> None:
        super().__init__(f"Introspection timed out for {model_id!r}")
        self.model_id = model_id
        self.timeout_s = timeout_s


class HubUnavailable(AakarDomainError):
    """An upstream HTTP dependency (HF Hub, arXiv, GitHub) timed out or failed.

    Distinct from ModelNotFound/ModelGated, which are *answers* from the upstream.
    This means we couldn't get an answer at all (timeout, transport error, 5xx) —
    a transient condition, mapped to HTTP 503 so the client can retry.
    """

    def __init__(self, model_id: str, *, source: str = "huggingface hub") -> None:
        super().__init__(f"Upstream {source} is unavailable for {model_id!r}")
        self.model_id = model_id
        self.source = source
