"""HTTP routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from aakar_api.api.dependencies import get_architecture_service
from aakar_api.application import ArchitectureService
from aakar_api.domain.spec import Spec

router = APIRouter(prefix="/api")

_MODEL_ID_PATTERN = r"^[a-zA-Z0-9_\-./]+$"
ModelIdQuery = Annotated[
    str,
    Query(
        ...,
        pattern=_MODEL_ID_PATTERN,
        min_length=1,
        max_length=200,
        description="HuggingFace model ID, e.g. meta-llama/Llama-3-8B",
        examples=["meta-llama/Llama-3-8B"],
    ),
]
ArchitectureServiceDep = Annotated[
    ArchitectureService,
    Depends(get_architecture_service),
]


@router.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/architecture", response_model=Spec, tags=["architecture"])
async def get_architecture(
    model_id: ModelIdQuery,
    service: ArchitectureServiceDep,
) -> Spec:
    return await service.get_architecture(model_id)
