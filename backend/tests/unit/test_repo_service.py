"""Unit tests for `RepoService` + `find_github_repo` — structural fakes."""

from __future__ import annotations

from aakar_api.application.hub_service import HubService
from aakar_api.application.repo_service import RepoService, find_github_repo
from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.hub import HubModelInfo
from aakar_api.domain.research import RepoInfo, SourceSnippet


class FakeHub(HubService):
    def __init__(self, info: HubModelInfo, readme: str | None = None) -> None:
        self._info = info
        self._readme = readme

    async def get_model_info(self, model_id: str) -> HubModelInfo:
        return self._info

    async def get_readme(self, model_id: str) -> str | None:
        return self._readme


class FakeGitHub:
    def __init__(self, *, raises: bool = False) -> None:
        self.raises = raises
        self.calls: list[tuple[str, str]] = []

    async def get_repo(self, owner: str, repo: str) -> RepoInfo:
        self.calls.append((owner, repo))
        if self.raises:
            raise HubUnavailable(f"{owner}/{repo}", source="github")
        return RepoInfo(full_name=f"{owner}/{repo}", html_url=f"https://github.com/{owner}/{repo}")

    async def get_source(self, url: str) -> SourceSnippet:  # pragma: no cover - unused
        raise NotImplementedError


def test_find_github_repo_extracts_owner_repo() -> None:
    assert find_github_repo("code at https://github.com/EleutherAI/gpt-neox here") == (
        "EleutherAI",
        "gpt-neox",
    )
    assert find_github_repo("no links here") is None
    assert find_github_repo("https://github.com/sponsors/someone") is None


async def test_resolves_repo_from_card_data() -> None:
    info = HubModelInfo(model_id="m", card_data={"repository": "https://github.com/org/repo"})
    service = RepoService(FakeHub(info), FakeGitHub())
    repo = await service.get_repo("m")
    assert repo is not None and repo.full_name == "org/repo"


async def test_falls_back_to_readme_scan() -> None:
    info = HubModelInfo(model_id="m", card_data={})
    github = FakeGitHub()
    service = RepoService(FakeHub(info, readme="see https://github.com/org/repo2"), github)
    await service.get_repo("m")
    assert github.calls == [("org", "repo2")]


async def test_none_when_no_repo_anywhere() -> None:
    info = HubModelInfo(model_id="m", card_data={})
    service = RepoService(FakeHub(info, readme="nothing relevant"), FakeGitHub())
    assert await service.get_repo("m") is None


async def test_none_when_github_unavailable() -> None:
    info = HubModelInfo(model_id="m", card_data={"repository": "https://github.com/org/repo"})
    service = RepoService(FakeHub(info), FakeGitHub(raises=True))
    assert await service.get_repo("m") is None
