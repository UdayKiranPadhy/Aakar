"""The composition Spec — the JSON contract returned by the API.

This module is the **single source of truth** for the Spec shape. The TypeScript
mirror lives at `frontend/src/domain/spec.ts` and must be kept in sync by hand;
both are documented in `docs/spec-contract.md`.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Node(BaseModel):
    """A single block in the architecture diagram.

    `children` is recursive — a decoder_block has child nodes (norm, attention,
    add, etc.), and self_attention has its own children (Q, K, V, SDPA, O).
    """

    model_config = ConfigDict(frozen=True)

    id: str
    type: str
    label: str
    meta: str | None = None
    params: dict[str, Any] = Field(default_factory=dict)
    children: list[Node] | None = None
    has_internals: bool = False
    param_count: int | None = None
    input_shape: str | None = None
    output_shape: str | None = None


class Spec(BaseModel):
    """Top-level composition spec for one model."""

    model_config = ConfigDict(frozen=True)

    model_id: str
    model_type: str
    config_summary: dict[str, Any]
    graph: list[Node]
    notes: list[str] | None = None
