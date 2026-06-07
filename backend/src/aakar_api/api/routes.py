"""HTTP routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Header, Query

from aakar_api.application import (
    ArchitectureService,
    HubService,
    PaperService,
    RepoService,
    SourceService,
)
from aakar_api.di import deps
from aakar_api.domain.hub import HubTrendingItem
from aakar_api.domain.research import Paper, RepoInfo, SourceSnippet
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
SortQuery = Annotated[str, Query(pattern=r"^(trending|downloads|likes|lastModified)$")]
LimitQuery = Annotated[int, Query(ge=1, le=100)]
ArxivIdQuery = Annotated[
    str,
    Query(
        ...,
        pattern=r"^[A-Za-z0-9.\-/]+$",
        min_length=1,
        max_length=60,
        description="arXiv id, e.g. 1706.03762 or math/0309136",
        examples=["1706.03762"],
    ),
]
# SSRF allowlist: only GitHub blob URLs for the two repos the introspector emits
# (`source_url`). Enforced as a Query pattern → non-matching urls are 422'd.
_SOURCE_URL_PATTERN = (
    r"^https://github\.com/(huggingface/transformers|pytorch/pytorch)/blob/"
    r"[^?#\s]+#L\d+(-L\d+)?$"
)
SourceUrlQuery = Annotated[
    str,
    Query(
        ...,
        pattern=_SOURCE_URL_PATTERN,
        max_length=400,
        description="A module source_url permalink",
    ),
]
ArchitectureServiceDep = Annotated[ArchitectureService, deps.depends(ArchitectureService)]
HubServiceDep = Annotated[HubService, deps.depends(HubService)]
PaperServiceDep = Annotated[PaperService, deps.depends(PaperService)]
RepoServiceDep = Annotated[RepoService, deps.depends(RepoService)]
SourceServiceDep = Annotated[SourceService, deps.depends(SourceService)]


@router.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


# Optional per-request HuggingFace read token for gated models.
HfTokenHeader = Annotated[str | None, Header(alias="X-HF-Token", max_length=200)]


@router.get("/architecture", response_model=Spec, tags=["architecture"])
async def get_architecture(
    model_id: ModelIdQuery,
    service: ArchitectureServiceDep,
    hf_token: HfTokenHeader = None,
) -> Spec:
    return await service.get_architecture(model_id, token=hf_token)


@router.get("/models", response_model=list[HubTrendingItem], tags=["hub"])
async def list_models(
    service: HubServiceDep,
    sort: SortQuery = "trending",
    limit: LimitQuery = 12,
) -> list[HubTrendingItem]:
    return await service.list_trending(sort=sort, limit=limit)


@router.get("/papers", response_model=list[Paper], tags=["research"])
async def list_model_papers(
    model_id: ModelIdQuery,
    service: PaperServiceDep,
) -> list[Paper]:
    """The arXiv paper(s) a model cites, resolved from its Hub `arxiv:` tags."""
    return await service.get_papers_for_model(model_id)


@router.get("/paper", response_model=Paper | None, tags=["research"])
async def get_paper(
    arxiv_id: ArxivIdQuery,
    service: PaperServiceDep,
) -> Paper | None:
    """A single arXiv paper looked up directly by id (null if not found)."""
    return await service.get_paper(arxiv_id)


@router.get("/repo", response_model=RepoInfo | None, tags=["research"])
async def get_repo(
    model_id: ModelIdQuery,
    service: RepoServiceDep,
) -> RepoInfo | None:
    """The model's linked GitHub repo (best-effort; null when none is found)."""
    return await service.get_repo(model_id)


@router.get("/source", response_model=SourceSnippet, tags=["research"])
async def get_source(
    url: SourceUrlQuery,
    service: SourceServiceDep,
) -> SourceSnippet:
    """The source slice behind a module's `source_url` (SSRF-allowlisted url)."""
    return await service.get_source(url)
