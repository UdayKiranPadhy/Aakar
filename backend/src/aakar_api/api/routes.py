"""HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from aakar_api.api.dependencies import get_architecture_service
from aakar_api.application import ArchitectureService
from aakar_api.domain.spec import Spec

router = APIRouter(prefix="/api")

# Conservative slug pattern: alphanumerics plus _ - . /  — matches HF Hub IDs
# like `meta-llama/Llama-3-8B` and rejects whitespace, control chars, and
# shell-special characters.
_MODEL_ID_PATTERN = r"^[a-zA-Z0-9_\-./]+$"


@router.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/architecture", response_model=Spec, tags=["architecture"])
async def get_architecture(
    model_id: str = Query(
        ...,
        pattern=_MODEL_ID_PATTERN,
        min_length=1,
        max_length=200,
        description="HuggingFace model ID, e.g. meta-llama/Llama-3-8B",
        examples=["meta-llama/Llama-3-8B"],
    ),
    service: ArchitectureService = Depends(get_architecture_service),
) -> Spec:
    return await service.get_architecture(model_id)