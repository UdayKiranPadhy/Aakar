"""HuggingFace Hub metadata — the JSON contract for the model-info / trending routes."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class HubSibling(BaseModel):
    """One file in a model repo. `size` is populated only when fetched with blobs."""

    model_config = ConfigDict(frozen=True)

    rfilename: str
    size: int | None = None


class HubModelInfo(BaseModel):
    """Public Hub metadata for a single model id (`GET /api/models/{id}`)."""

    model_config = ConfigDict(frozen=True, populate_by_name=True)

    model_id: str = Field(validation_alias="id")
    author: str | None = None
    sha: str | None = None
    last_modified: str | None = Field(default=None, validation_alias="lastModified")
    private: bool | None = None
    # The Hub returns `false`, `"auto"`, or `"manual"`.
    gated: bool | str | None = None
    downloads: int | None = None
    likes: int | None = None
    library_name: str | None = None
    pipeline_tag: str | None = None
    license: str | None = None
    tags: list[str] = Field(default_factory=list)
    siblings: list[HubSibling] = Field(default_factory=list)
    # Open-ended pass-throughs — never enumerate their keys.
    #   safetensors: {"parameters": {"BF16": 8030261248, "F32": ...}, "total": ...}
    #   card_data:   the `cardData` block verbatim (base_model lineage, etc.)
    #   config:      parsed config.json (architectures, model_type,
    #                tokenizer_config, quantization_config) — verbatim.
    safetensors: dict[str, Any] | None = None
    card_data: dict[str, Any] | None = Field(default=None, validation_alias="cardData")
    config: dict[str, Any] | None = None
    # Hub-computed extras (camelCase on the wire, snake_case in our contract).
    created_at: str | None = Field(default=None, validation_alias="createdAt")
    used_storage: int | None = Field(default=None, validation_alias="usedStorage")
    # Top spaces using this model (ids like "owner/space"); `inference` carries
    # the warm/cold status when the Hub reports it (often absent).
    spaces: list[str] | None = None
    inference: str | None = None


class HubTrendingItem(BaseModel):
    """Lean projection of one model from the `GET /api/models` list endpoint."""

    model_config = ConfigDict(frozen=True, populate_by_name=True)

    model_id: str = Field(validation_alias="id")
    downloads: int | None = None
    likes: int | None = None
    pipeline_tag: str | None = None
    library_name: str | None = None
    tags: list[str] = Field(default_factory=list)
