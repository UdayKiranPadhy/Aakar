"""HTTP routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel

from aakar_api.api.dependencies import get_adapter_registry, get_architecture_service
from aakar_api.adapters import AdapterRegistry
from aakar_api.application import ArchitectureService
from aakar_api.domain.spec import Spec


class AdaptersInfo(BaseModel):
    """Metadata about the registered adapters."""

    registered: list[str]
    default: str

router = APIRouter(prefix="/api")

# Conservative slug pattern: alphanumerics plus _ - . /  — matches HF Hub IDs
# like `meta-llama/Llama-3-8B` and rejects whitespace, control chars, and
# shell-special characters.
_MODEL_ID_PATTERN = r"^[a-zA-Z0-9_\-./]+$"


@router.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/adapters", response_model=AdaptersInfo, tags=["meta"])
async def list_adapters(
    registry: AdapterRegistry = Depends(get_adapter_registry),
) -> AdaptersInfo:
    """Enumerate registered model_type values and the fallback adapter name."""
    return AdaptersInfo(
        registered=list(registry.registered_types),
        default=type(registry.default).__name__,
    )


@router.get("/architecture", response_model=Spec, tags=["architecture"])
async def get_architecture(
    response: Response,
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
    spec = await service.get_architecture(model_id)
    # Configs are content-addressed on the Hub; safe to cache aggressively.
    response.headers["Cache-Control"] = "public, max-age=86400"
    return spec
