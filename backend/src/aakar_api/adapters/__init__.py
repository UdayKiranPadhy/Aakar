"""Adapter layer — Strategy pattern over architecture-specific Spec construction.

Each concrete adapter handles one or more `model_type` values from HuggingFace
configs and produces a `Spec`. The `AdapterRegistry` resolves the right adapter
at runtime, falling back to `GenericAdapter` for unknown architectures.

To add a new architecture, see `docs/adapters.md`.
"""

from aakar_api.adapters.base import ArchitectureAdapter
from aakar_api.adapters.catalog import build_default_registry
from aakar_api.adapters.generic import GenericAdapter
from aakar_api.adapters.llama_family import LlamaFamilyAdapter
from aakar_api.adapters.registry import AdapterRegistry

__all__ = [
    "AdapterRegistry",
    "ArchitectureAdapter",
    "GenericAdapter",
    "LlamaFamilyAdapter",
    "build_default_registry",
]
