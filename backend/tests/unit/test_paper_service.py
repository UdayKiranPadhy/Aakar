"""Unit tests for `PaperService` + `arxiv_ids_from_tags` — structural fakes."""

from __future__ import annotations

from typing import Any

from aakar_api.application.hub_service import HubService
from aakar_api.application.paper_service import PaperService, arxiv_ids_from_tags
from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.hub import HubModelInfo
from aakar_api.domain.research import Paper, PaperMetrics


class FakeHubService(HubService):
    def __init__(self, info: HubModelInfo, paper: dict[str, Any] | None = None) -> None:
        self._info = info
        self._paper = paper

    async def get_model_info(self, model_id: str) -> HubModelInfo:
        return self._info

    async def get_paper(self, arxiv_id: str) -> dict[str, Any] | None:
        return self._paper


class FakeArxiv:
    def __init__(self, papers: list[Paper]) -> None:
        self._papers = papers
        self.calls = 0

    async def get_papers(self, arxiv_ids: list[str]) -> list[Paper]:
        self.calls += 1
        return list(self._papers)


class FakeCitations:
    def __init__(
        self,
        counts: dict[str, int] | None = None,
        *,
        raises: bool = False,
        metrics: dict[str, PaperMetrics] | None = None,
    ) -> None:
        self._counts = counts or {}
        self._metrics = metrics or {}
        self._raises = raises

    async def get_metrics(self, arxiv_ids: list[str]) -> dict[str, PaperMetrics]:
        if self._raises:
            raise HubUnavailable("x", source="openalex")
        result = {
            k: PaperMetrics(citation_count=v) for k, v in self._counts.items() if k in arxiv_ids
        }
        result.update({k: m for k, m in self._metrics.items() if k in arxiv_ids})
        return result


class FakePaperCache:
    def __init__(self) -> None:
        self.store: dict[str, list[Paper]] = {}

    async def get(self, model_id: str) -> list[Paper] | None:
        return self.store.get(model_id)

    async def set(self, model_id: str, papers: list[Paper]) -> None:
        self.store[model_id] = papers


def _paper(pid: str = "1706.03762") -> Paper:
    return Paper(arxiv_id=pid, title="T", summary="S", abs_url="a", pdf_url="p")


def _service(
    info: HubModelInfo,
    arxiv: FakeArxiv,
    *,
    citations: FakeCitations | None = None,
    cache: FakePaperCache | None = None,
    paper: dict[str, object] | None = None,
) -> PaperService:
    return PaperService(
        FakeHubService(info, paper),
        arxiv,
        citations or FakeCitations(),
        cache or FakePaperCache(),
    )


async def test_hf_papers_is_primary_metadata_source() -> None:
    # When HF Papers has the paper, it's the source of truth and arXiv is untouched.
    info = HubModelInfo(model_id="m", tags=["arxiv:2310.06825"])
    arxiv = FakeArxiv([_paper()])
    service = _service(
        info,
        arxiv,
        paper={
            "title": "Mistral 7B",
            "summary": "We introduce Mistral 7B.",
            "authors": [{"name": "Albert Q. Jiang"}],
            "publishedAt": "2023-10-10T00:00:00Z",
            "upvotes": 42,
            "numTotalModels": 1337,
        },
    )
    papers = await service.get_papers_for_model("m")
    assert len(papers) == 1
    assert papers[0].title == "Mistral 7B"
    assert papers[0].authors == ["Albert Q. Jiang"]
    assert papers[0].hf_upvotes == 42
    assert papers[0].hf_model_count == 1337
    assert arxiv.calls == 0  # HF Papers covered it — arXiv stays off the hot path


async def test_falls_back_to_arxiv_when_not_on_hf_papers() -> None:
    info = HubModelInfo(model_id="m", tags=["arxiv:1706.03762"])
    arxiv = FakeArxiv([_paper("1706.03762")])
    service = _service(info, arxiv, paper=None)  # HF Papers 404 → arXiv fallback
    papers = await service.get_papers_for_model("m")
    assert [p.arxiv_id for p in papers] == ["1706.03762"]
    assert arxiv.calls == 1


async def test_layers_on_full_citation_metrics() -> None:
    info = HubModelInfo(model_id="m", tags=["arxiv:2310.06825"])
    metrics = {
        "2310.06825": PaperMetrics(
            citation_count=282,
            influential_citation_count=40,
            tldr="A small, strong 7B model.",
            fields_of_study=["Computer Science"],
        )
    }
    service = _service(
        info,
        FakeArxiv([]),
        citations=FakeCitations(metrics=metrics),
        paper={"title": "Mistral 7B", "summary": "...", "authors": []},
    )
    paper = (await service.get_papers_for_model("m"))[0]
    assert paper.citation_count == 282
    assert paper.influential_citation_count == 40
    assert paper.tldr == "A small, strong 7B model."
    assert paper.fields_of_study == ["Computer Science"]


def test_arxiv_ids_from_tags_extracts_dedupes_and_is_case_insensitive() -> None:
    tags = [
        "pytorch",
        "arxiv:1706.03762",
        "Arxiv:1706.03762",  # dup, different case
        "arxiv:2005.14165",
        "text-generation",
    ]
    assert arxiv_ids_from_tags(tags) == ["1706.03762", "2005.14165"]


async def test_resolves_from_tags_and_caches() -> None:
    info = HubModelInfo(model_id="m", tags=["arxiv:1706.03762"])
    arxiv = FakeArxiv([_paper()])
    service = _service(info, arxiv)

    first = await service.get_papers_for_model("m")
    second = await service.get_papers_for_model("m")

    assert [p.arxiv_id for p in first] == ["1706.03762"]
    assert first == second
    assert arxiv.calls == 1  # second served from cache


async def test_enriches_with_citation_count() -> None:
    info = HubModelInfo(model_id="m", tags=["arxiv:1706.03762"])
    service = _service(
        info, FakeArxiv([_paper()]), citations=FakeCitations({"1706.03762": 12345})
    )
    papers = await service.get_papers_for_model("m")
    assert papers[0].citation_count == 12345


async def test_citation_source_failure_is_graceful() -> None:
    info = HubModelInfo(model_id="m", tags=["arxiv:1706.03762"])
    service = _service(info, FakeArxiv([_paper()]), citations=FakeCitations(raises=True))
    papers = await service.get_papers_for_model("m")
    assert papers[0].citation_count is None  # paper still returned, no count


async def test_no_arxiv_tag_yields_empty_without_calling_arxiv() -> None:
    info = HubModelInfo(model_id="m", tags=["pytorch", "text-generation"])
    arxiv = FakeArxiv([_paper()])
    service = _service(info, arxiv)

    assert await service.get_papers_for_model("m") == []
    assert arxiv.calls == 0


async def test_get_paper_by_id_returns_first_with_citation() -> None:
    arxiv = FakeArxiv([_paper("2005.14165")])
    service = _service(
        HubModelInfo(model_id="x"), arxiv, citations=FakeCitations({"2005.14165": 99})
    )
    paper = await service.get_paper("2005.14165")
    assert paper is not None
    assert paper.arxiv_id == "2005.14165"
    assert paper.citation_count == 99


async def test_get_paper_by_id_none_when_missing() -> None:
    service = _service(HubModelInfo(model_id="x"), FakeArxiv([]))
    assert await service.get_paper("0000.00000") is None
