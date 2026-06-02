"""Integration tests for the research routes (/api/papers, /api/paper)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from aakar_api.application import PaperService
from aakar_api.di import deps
from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import Paper
from aakar_api.main import app


class FakePaperService(PaperService):
    def __init__(
        self,
        *,
        model_papers: list[Paper] | None = None,
        paper: Paper | None = None,
        raises: dict[str, Exception] | None = None,
    ) -> None:
        self._model_papers = model_papers or []
        self._paper = paper
        self._raises = raises or {}

    async def get_papers_for_model(self, model_id: str) -> list[Paper]:
        if model_id in self._raises:
            raise self._raises[model_id]
        return self._model_papers

    async def get_paper(self, arxiv_id: str) -> Paper | None:
        return self._paper


def _paper() -> Paper:
    return Paper(
        arxiv_id="1706.03762",
        title="Attention Is All You Need",
        summary="The dominant sequence transduction models...",
        authors=["Ashish Vaswani"],
        categories=["cs.CL"],
        abs_url="https://arxiv.org/abs/1706.03762",
        pdf_url="https://arxiv.org/pdf/1706.03762",
    )


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def overrides():
    with deps.override_for_test() as container:
        yield container


def test_papers_ok(client: TestClient, overrides) -> None:
    overrides[PaperService] = FakePaperService(model_papers=[_paper()])
    r = client.get("/api/papers", params={"model_id": "gpt2"})
    assert r.status_code == 200
    body = r.json()
    assert body[0]["arxiv_id"] == "1706.03762"
    assert body[0]["title"] == "Attention Is All You Need"
    assert body[0]["categories"] == ["cs.CL"]


def test_papers_empty_when_no_arxiv_tag(client: TestClient, overrides) -> None:
    overrides[PaperService] = FakePaperService(model_papers=[])
    r = client.get("/api/papers", params={"model_id": "some/model"})
    assert r.status_code == 200
    assert r.json() == []


def test_papers_503_when_arxiv_unavailable(client: TestClient, overrides) -> None:
    overrides[PaperService] = FakePaperService(
        raises={"gpt2": HubUnavailable("gpt2", source="arxiv")}
    )
    r = client.get("/api/papers", params={"model_id": "gpt2"})
    assert r.status_code == 503
    assert r.json()["kind"] == "hub_unavailable"


def test_paper_by_id_ok(client: TestClient, overrides) -> None:
    overrides[PaperService] = FakePaperService(paper=_paper())
    r = client.get("/api/paper", params={"arxiv_id": "1706.03762"})
    assert r.status_code == 200
    assert r.json()["arxiv_id"] == "1706.03762"


def test_paper_by_id_null_when_missing(client: TestClient, overrides) -> None:
    overrides[PaperService] = FakePaperService(paper=None)
    r = client.get("/api/paper", params={"arxiv_id": "0000.00000"})
    assert r.status_code == 200
    assert r.json() is None


def test_paper_rejects_bad_arxiv_id(client: TestClient, overrides) -> None:
    overrides[PaperService] = FakePaperService(paper=_paper())
    r = client.get("/api/paper", params={"arxiv_id": "has spaces"})
    assert r.status_code == 400


def test_papers_rejects_bad_model_id(client: TestClient, overrides) -> None:
    overrides[PaperService] = FakePaperService(model_papers=[])
    r = client.get("/api/papers", params={"model_id": "has spaces"})
    assert r.status_code == 400
