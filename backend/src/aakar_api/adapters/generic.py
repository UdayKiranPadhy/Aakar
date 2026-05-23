"""Fallback adapter for unrecognized `model_type` values.

Renders a single "unknown architecture" node with whatever standard fields
are present in the config, plus a note explaining that the architecture isn't
specifically supported. The frontend uses the `notes` field to show a banner.
"""

from __future__ import annotations

from typing import Any

from aakar_api.adapters.base import ArchitectureAdapter
from aakar_api.adapters.building import BlockBuilder
from aakar_api.domain.model_config import ModelConfig
from aakar_api.domain.spec import Node, Spec


class GenericAdapter(ArchitectureAdapter):
    """Default adapter for unsupported architectures.

    Reads only the most universal fields and emits a placeholder node — the
    frontend renders it with the standard `GenericBlockNode`. A note in
    `Spec.notes` flags the fallback so the UI can show a banner.
    """

    @property
    def supported_model_types(self) -> tuple[str, ...]:
        # The generic adapter is the registry's default, not a registered
        # adapter. Returning the empty tuple makes that explicit.
        return ()

    def build(self, config: ModelConfig, model_id: str) -> Spec:
        resolved_type = config.model_type or "unknown"
        node = self._build_unknown(config)
        return Spec(
            model_id=model_id,
            model_type=resolved_type,
            config_summary=self._summarize(config),
            graph=[node],
            notes=[
                f"Generic rendering — model_type {resolved_type!r} is not "
                "specifically supported. Some architectural details may not "
                "be shown accurately."
            ],
        )

    def _build_unknown(self, c: ModelConfig) -> Node:
        params: dict[str, Any] = {}
        for key in ("hidden_size", "num_hidden_layers", "vocab_size"):
            try:
                params[key] = int(c.raw[key])
            except (KeyError, TypeError, ValueError):
                pass
        return (
            BlockBuilder("unknown", "unknown_architecture")
            .label(f"Unrecognized architecture: {c.model_type or 'unknown'}")
            .meta("generic view — see banner")
            .params(**params)
            .build()
        )

    def _summarize(self, c: ModelConfig) -> dict[str, Any]:
        summary: dict[str, Any] = {"model_type": c.model_type or "unknown"}
        for key in ("hidden_size", "num_hidden_layers", "vocab_size"):
            if key in c.raw:
                summary[key] = c.raw[key]
        return summary
