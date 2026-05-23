"""Abstract base class for architecture adapters (Strategy pattern)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from aakar_api.domain.model_config import ModelConfig
from aakar_api.domain.spec import Spec


class ArchitectureAdapter(ABC):
    """Builds a `Spec` for a specific model architecture family.

    Concrete adapters declare which `model_type` strings they support via the
    `supported_model_types` property. The `AdapterRegistry` uses this to
    register and resolve adapters.

    Subclasses live alongside this file (e.g., `llama_family.py`,
    `generic.py`) and never need to modify each other (OCP).
    """

    @property
    @abstractmethod
    def supported_model_types(self) -> tuple[str, ...]:
        """The `model_type` values this adapter handles (e.g., ('llama', 'mistral'))."""

    @abstractmethod
    def build(self, config: ModelConfig, model_id: str) -> Spec:
        """Produce the composition Spec for the given model."""
