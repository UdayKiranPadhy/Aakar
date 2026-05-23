"""Composition root for the adapter layer.

`build_default_registry()` is the **only** place the codebase enumerates which
concrete adapters exist. Adding a new adapter is two lines: an import and a
`registry.register(...)` call. No other file changes (OCP).
"""

from __future__ import annotations

from aakar_api.adapters.generic import GenericAdapter
from aakar_api.adapters.llama_family import LlamaFamilyAdapter
from aakar_api.adapters.registry import AdapterRegistry


def build_default_registry() -> AdapterRegistry:
    """Build the registry used in production. Tests may build their own."""
    registry = AdapterRegistry(default=GenericAdapter())
    registry.register(LlamaFamilyAdapter())
    # Future:
    # registry.register(MixtralAdapter())
    # registry.register(MambaAdapter())
    return registry
