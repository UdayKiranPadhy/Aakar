"""Integration tests for /api/repo and /api/source (incl. the SSRF allowlist)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from aakar_api.application import RepoService, SourceService
from aakar_api.di import deps
from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import RepoInfo, SourceSnippet
from aakar_api.main import app

_VALID_SOURCE = (
    "https://github.com/huggingface/transformers/blob/v5.9.0/"
    "src/transformers/models/gpt2/modeling_gpt2.py#L639"
)


class FakeRepoService(RepoService):
    def __init__(self, repo: RepoInfo | None = None) -> None:
        self._repo = repo

    async def get_repo(self, model_id: str) -> RepoInfo | None:
        return self._repo


class FakeSourceService(SourceService):
    def __init__(
        self, snippet: SourceSnippet | None = None, raises: Exception | None = None
    ) -> None:
        self._snippet = snippet
        self._raises = raises

    async def get_source(self, url: str) -> SourceSnippet:
        if self._raises:
            raise self._raises
        assert self._snippet is not None
        return self._snippet


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def overrides():
    with deps.override_for_test() as container:
        yield container


def test_repo_ok(client: TestClient, overrides) -> None:
    overrides[RepoService] = FakeRepoService(
        RepoInfo(full_name="org/repo", html_url="https://github.com/org/repo", stars=42)
    )
    r = client.get("/api/repo", params={"model_id": "some/model"})
    assert r.status_code == 200
    body = r.json()
    assert body["full_name"] == "org/repo"
    assert body["stars"] == 42


def test_repo_null_when_unresolved(client: TestClient, overrides) -> None:
    overrides[RepoService] = FakeRepoService(None)
    r = client.get("/api/repo", params={"model_id": "some/model"})
    assert r.status_code == 200
    assert r.json() is None


def test_source_ok(client: TestClient, overrides) -> None:
    snippet = SourceSnippet(
        url=_VALID_SOURCE,
        owner="huggingface",
        repo="transformers",
        ref="v5.9.0",
        path="src/transformers/models/gpt2/modeling_gpt2.py",
        start_line=639,
        end_line=700,
        code="class GPT2Attention(nn.Module): ...",
        language="python",
    )
    overrides[SourceService] = FakeSourceService(snippet)
    r = client.get("/api/source", params={"url": _VALID_SOURCE})
    assert r.status_code == 200
    assert r.json()["start_line"] == 639


def test_source_503_when_github_unavailable(client: TestClient, overrides) -> None:
    overrides[SourceService] = FakeSourceService(raises=HubUnavailable("x", source="github"))
    r = client.get("/api/source", params={"url": _VALID_SOURCE})
    assert r.status_code == 503
    assert r.json()["kind"] == "hub_unavailable"


@pytest.mark.parametrize(
    "bad_url",
    [
        "https://evil.example.com/x#L1",
        "https://github.com/some/other-repo/blob/main/x.py#L1",  # repo not allowlisted
        "https://github.com/huggingface/transformers/blob/v5.9.0/x.py",  # no #L anchor
        "http://github.com/huggingface/transformers/blob/v5.9.0/x.py#L1",  # not https
    ],
)
def test_source_rejects_non_allowlisted_urls(
    client: TestClient, overrides, bad_url: str
) -> None:
    overrides[SourceService] = FakeSourceService()
    r = client.get("/api/source", params={"url": bad_url})
    assert r.status_code == 400  # blocked by the Query-pattern SSRF guard (validation -> 400)
