"""Application service — resolve a model's GitHub repo and fetch its metadata.

Best-effort: scans the model's card metadata, then its README, for a
`github.com/<owner>/<repo>` link. Returns None when none is found or the repo
fetch fails — the Research view simply omits the repo card.
"""

from __future__ import annotations

import json
import re

from aakar_api.application.hub_service import HubService
from aakar_api.application.interfaces import GitHubClient
from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import RepoInfo

_GH_REPO = re.compile(r"github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)")
# Path segments that are github features, not repos.
_NOT_OWNERS = {"sponsors", "orgs", "topics", "about", "settings", "features", "marketplace"}


def find_github_repo(text: str) -> tuple[str, str] | None:
    for owner, repo in _GH_REPO.findall(text):
        if owner.lower() in _NOT_OWNERS:
            continue
        repo = repo.removesuffix(".git")
        if repo.lower() in {"blob", "tree", "raw"}:
            continue
        return owner, repo
    return None


class RepoService:
    def __init__(self, hub: HubService, github: GitHubClient) -> None:
        self._hub = hub
        self._github = github

    async def get_repo(self, model_id: str) -> RepoInfo | None:
        info = await self._hub.get_model_info(model_id)
        found = find_github_repo(json.dumps(info.card_data or {}))
        if found is None:
            readme = await self._hub.get_readme(model_id)
            if readme:
                found = find_github_repo(readme)
        if found is None:
            return None
        try:
            return await self._github.get_repo(*found)
        except HubUnavailable:
            return None
