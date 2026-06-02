"""Application service — fetch a source-code slice behind a `source_url`.

Thin pass-through to the GitHub client; the route enforces the SSRF allowlist on
the incoming URL before this is reached.
"""

from __future__ import annotations

from aakar_api.application.interfaces import GitHubClient
from aakar_api.domain.research import SourceSnippet


class SourceService:
    def __init__(self, github: GitHubClient) -> None:
        self._github = github

    async def get_source(self, url: str) -> SourceSnippet:
        return await self._github.get_source(url)
