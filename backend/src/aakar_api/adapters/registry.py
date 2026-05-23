"""Registry that resolves model_type → ArchitectureAdapter."""

from __future__ import annotations

from aakar_api.adapters.base import ArchitectureAdapter


class AdapterRegistry:
    """Maps model_type strings to their handling adapter.

    Unknown model types fall back to the `default` adapter, which is expected
    to render a generic view (with a note explaining the fallback).
    """

    def __init__(self, default: ArchitectureAdapter) -> None:
        self._by_type: dict[str, ArchitectureAdapter] = {}
        self._default = default

    def register(self, adapter: ArchitectureAdapter) -> None:
        """Register an adapter for all of its supported model types.

        Raises ValueError on duplicate registration — catching collisions early
        beats a silent override at runtime.
        """
        for model_type in adapter.supported_model_types:
            if model_type in self._by_type:
                existing = type(self._by_type[model_type]).__name__
                incoming = type(adapter).__name__
                raise ValueError(
                    f"Adapter for model_type {model_type!r} already registered "
                    f"({existing}); cannot register {incoming}."
                )
            self._by_type[model_type] = adapter

    def resolve(self, model_type: str) -> ArchitectureAdapter:
        """Return the registered adapter, or the default if none matches."""
        return self._by_type.get(model_type, self._default)

    @property
    def registered_types(self) -> tuple[str, ...]:
        """All explicitly-registered model_type values (excludes the default)."""
        return tuple(self._by_type.keys())

    @property
    def default(self) -> ArchitectureAdapter:
        return self._default
