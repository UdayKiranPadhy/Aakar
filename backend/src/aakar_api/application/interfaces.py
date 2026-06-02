"""Abstract interfaces the application layer depends on.

Per DIP, the application layer declares the shape it needs and infrastructure
implements it. Using `typing.Protocol` (structural typing) instead of `abc.ABC`
keeps fakes trivial — any class with the right methods satisfies the contract,
no inheritance required.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from aakar_api.domain.hub import HubModelInfo, HubTrendingItem
from aakar_api.domain.research import Paper, PaperMetrics, RepoInfo, SourceSnippet
from aakar_api.domain.spec import Spec


@runtime_checkable
class Introspector(Protocol):
    """Builds a Spec for a HuggingFace model ID.

    Implementations may walk the real `transformers` nn.Module tree (production)
    or return canned specs (tests). Both methods are async because the production
    impl wraps blocking work in `asyncio.to_thread`.
    """

    async def introspect(self, model_id: str) -> Spec: ...

    async def fetch_config_hash(self, model_id: str) -> str: ...


@runtime_checkable
class SpecCache(Protocol):
    """Reads/writes `Spec` objects keyed by (model_id, config_hash)."""

    async def get(self, model_id: str, config_hash: str) -> Spec | None: ...

    async def set(self, model_id: str, config_hash: str, spec: Spec) -> None: ...


@runtime_checkable
class HubMetadataClient(Protocol):
    """Fetches public HuggingFace Hub metadata for a model id.

    `get_readme` is separate because the model card is a distinct raw-markdown
    endpoint (not part of the `/api/models` JSON); `list_trending` is the
    no-model-id list call backing the dynamic example chips.
    """

    async def get_model_metadata(self, model_id: str) -> HubModelInfo: ...

    async def get_readme(self, model_id: str) -> str | None: ...

    async def list_trending(self, *, sort: str, limit: int) -> list[HubTrendingItem]: ...

    async def get_paper(self, arxiv_id: str) -> dict[str, Any] | None: ...
    #   HF Papers metadata (upvotes, numTotalModels, …); None if not on HF Papers.


@runtime_checkable
class HubMetadataCache(Protocol):
    """TTL cache for volatile Hub data (downloads/likes drift with no content key)."""

    async def get_metadata(self, model_id: str) -> HubModelInfo | None: ...

    async def set_metadata(self, model_id: str, info: HubModelInfo) -> None: ...

    async def get_readme(self, model_id: str) -> str | None: ...

    async def set_readme(self, model_id: str, readme: str) -> None: ...

    async def get_trending(self, key: str) -> list[HubTrendingItem] | None: ...

    async def set_trending(self, key: str, items: list[HubTrendingItem]) -> None: ...


@runtime_checkable
class ArxivClient(Protocol):
    """Fetches paper metadata from the arXiv API for a batch of ids."""

    async def get_papers(self, arxiv_ids: list[str]) -> list[Paper]: ...


@runtime_checkable
class GitHubClient(Protocol):
    """Fetches GitHub repo metadata and source-file slices."""

    async def get_repo(self, owner: str, repo: str) -> RepoInfo: ...

    async def get_source(self, url: str) -> SourceSnippet: ...


@runtime_checkable
class CitationClient(Protocol):
    """Looks up citation-graph metrics for arXiv ids, keyed by the input id.

    Returns only the ids it has data for — missing ids are simply absent.
    Raises `HubUnavailable` on transport failure so the caller can degrade
    gracefully.
    """

    async def get_metrics(self, arxiv_ids: list[str]) -> dict[str, PaperMetrics]: ...


@runtime_checkable
class PaperCache(Protocol):
    """Caches the resolved paper list for a model id (papers are ~immutable)."""

    async def get(self, model_id: str) -> list[Paper] | None: ...

    async def set(self, model_id: str, papers: list[Paper]) -> None: ...
