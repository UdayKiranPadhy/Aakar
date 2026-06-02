"""Application service — resolves the paper(s) behind a model.

Flow: read the model's Hub tags (via the cached `HubService`) → extract any
`arxiv:` ids → resolve each paper's metadata, **preferring HF Papers** (reliable,
same host as the rest of the Hub API) and **falling back to the arXiv API** only
for papers HF Papers doesn't index. This keeps the heavily-rate-limited (429)
arXiv endpoint off the hot path. Citation counts are layered on top. Cache-aside
by model id; a model with no arXiv tag simply yields an empty list.
"""

from __future__ import annotations

import contextlib
import re
from typing import Any

from aakar_api.application.hub_service import HubService
from aakar_api.application.interfaces import ArxivClient, CitationClient, PaperCache
from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import Paper

_ARXIV_TAG = re.compile(r"^arxiv:(.+)$", re.IGNORECASE)
_VERSION_SUFFIX = re.compile(r"v\d+$")


def _base_id(arxiv_id: str) -> str:
    return _VERSION_SUFFIX.sub("", arxiv_id.strip())


def _int_or_none(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _paper_from_hf(arxiv_id: str, data: dict[str, Any]) -> Paper:
    """Build a Paper from an HF Papers record (the primary metadata source)."""
    base = _base_id(arxiv_id)
    authors = [
        a["name"] for a in data.get("authors", []) if isinstance(a, dict) and a.get("name")
    ]
    return Paper(
        arxiv_id=arxiv_id,
        title=str(data.get("title") or arxiv_id).strip(),
        summary=str(data.get("summary") or "").strip(),
        authors=authors,
        published=data.get("publishedAt"),
        categories=[],  # HF Papers doesn't expose arXiv categories
        abs_url=f"https://arxiv.org/abs/{base}",
        pdf_url=f"https://arxiv.org/pdf/{base}",
        hf_upvotes=_int_or_none(data.get("upvotes")),
        hf_model_count=_int_or_none(data.get("numTotalModels")),
        hf_dataset_count=_int_or_none(data.get("numTotalDatasets")),
        hf_space_count=_int_or_none(data.get("numTotalSpaces")),
    )


def arxiv_ids_from_tags(tags: list[str]) -> list[str]:
    """Pull `arxiv:<id>` ids out of a model's Hub tags, preserving order, deduped."""
    ids: list[str] = []
    for tag in tags:
        match = _ARXIV_TAG.match(tag)
        if match:
            candidate = match.group(1).strip()
            if candidate and candidate not in ids:
                ids.append(candidate)
    return ids


class PaperService:
    """Orchestrates Hub-tag resolution + arXiv lookup + citation enrichment.

    Cached by model id (the cached list already carries citation counts).
    """

    def __init__(
        self,
        hub: HubService,
        arxiv: ArxivClient,
        citations: CitationClient,
        cache: PaperCache,
    ) -> None:
        self._hub = hub
        self._arxiv = arxiv
        self._citations = citations
        self._cache = cache

    async def get_papers_for_model(self, model_id: str) -> list[Paper]:
        cached = await self._cache.get(model_id)
        if cached is not None:
            return cached
        info = await self._hub.get_model_info(model_id)
        ids = arxiv_ids_from_tags(info.tags)
        papers = await self._resolve(ids) if ids else []
        papers = await self._with_metrics(papers)
        await self._cache.set(model_id, papers)
        return papers

    async def get_paper(self, arxiv_id: str) -> Paper | None:
        papers = await self._with_metrics(await self._resolve([arxiv_id]))
        return papers[0] if papers else None

    async def _resolve(self, ids: list[str]) -> list[Paper]:
        """HF Papers first (per id); arXiv fallback for the rest (one batch call)."""
        papers: list[Paper] = []
        missing: list[str] = []
        for arxiv_id in ids:
            try:
                data = await self._hub.get_paper(_base_id(arxiv_id))
            except HubUnavailable:
                data = None
            if data is not None and data.get("title"):
                papers.append(_paper_from_hf(arxiv_id, data))
            else:
                missing.append(arxiv_id)
        if missing:
            # arXiv throttled/down — skip the long-tail papers gracefully.
            with contextlib.suppress(HubUnavailable):
                papers.extend(await self._arxiv.get_papers(missing))
        return papers

    async def _with_metrics(self, papers: list[Paper]) -> list[Paper]:
        """Layer citation metrics (count, influential count, TLDR, fields) onto
        the papers. Citation source down → return papers unenriched."""
        if not papers:
            return papers
        try:
            metrics = await self._citations.get_metrics([p.arxiv_id for p in papers])
        except HubUnavailable:
            return papers
        out: list[Paper] = []
        for paper in papers:
            m = metrics.get(paper.arxiv_id)
            if m is None:
                out.append(paper)
            else:
                out.append(
                    paper.model_copy(
                        update={
                            "citation_count": m.citation_count,
                            "influential_citation_count": m.influential_citation_count,
                            "tldr": m.tldr,
                            "fields_of_study": m.fields_of_study,
                        }
                    )
                )
        return out
