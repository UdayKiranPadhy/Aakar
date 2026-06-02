"""GitHub client — repo metadata and source-file slices.

`get_source` takes one of the introspector's `source_url` permalinks
(`github.com/{owner}/{repo}/blob/{ref}/{path}#L{n}`), fetches the file from the
raw CDN, and returns the slice from the anchor line to the end of its
class/function (or a line cap). Optional `GITHUB_TOKEN` raises the rate limit.
"""

from __future__ import annotations

import os
import re
from typing import Any

import httpx

from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import RepoInfo, SourceSnippet

_GITHUB_API = "https://api.github.com"
_RAW = "https://raw.githubusercontent.com"
_DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_MAX_LINES = 140

_BLOB = re.compile(
    r"^https://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/blob/"
    r"(?P<ref>[^/]+)/(?P<path>[^#?]+)#L(?P<start>\d+)(?:-L(?P<end>\d+))?$"
)
_LANG_BY_EXT = {"py": "python", "pyi": "python", "c": "c", "cpp": "cpp", "h": "cpp"}


def _as_int(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


class GitHubApiClient:
    def __init__(
        self,
        *,
        token: str | None = None,
        client: httpx.AsyncClient | None = None,
        timeout: httpx.Timeout = _DEFAULT_TIMEOUT,
    ) -> None:
        token = token or os.environ.get("GITHUB_TOKEN")
        headers = {"Accept": "application/vnd.github+json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._client = client or httpx.AsyncClient(
            timeout=timeout, headers=headers, follow_redirects=True
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def get_repo(self, owner: str, repo: str) -> RepoInfo:
        data = await self._get_json(f"{_GITHUB_API}/repos/{owner}/{repo}", source=f"{owner}/{repo}")
        license_obj = data.get("license")
        spdx = license_obj.get("spdx_id") if isinstance(license_obj, dict) else None
        return RepoInfo(
            full_name=data.get("full_name") or f"{owner}/{repo}",
            html_url=data.get("html_url") or f"https://github.com/{owner}/{repo}",
            description=data.get("description"),
            stars=_as_int(data.get("stargazers_count")),
            forks=_as_int(data.get("forks_count")),
            topics=list(data.get("topics") or []),
            license=spdx if spdx and spdx != "NOASSERTION" else None,
            language=data.get("language"),
            pushed_at=data.get("pushed_at"),
        )

    async def get_source(self, url: str) -> SourceSnippet:
        match = _BLOB.match(url)
        if match is None:
            raise ValueError(f"Unsupported source url: {url!r}")
        owner, repo = match["owner"], match["repo"]
        ref, path = match["ref"], match["path"]
        start = int(match["start"])
        end_anchor = int(match["end"]) if match["end"] else None

        text = await self._get_text(f"{_RAW}/{owner}/{repo}/{ref}/{path}", source=f"{owner}/{repo}")
        lines = text.split("\n")
        start = max(1, min(start, len(lines)))
        end = (
            max(start, min(end_anchor, len(lines)))
            if end_anchor is not None
            else _definition_end(lines, start)
        )
        ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
        return SourceSnippet(
            url=url,
            owner=owner,
            repo=repo,
            ref=ref,
            path=path,
            start_line=start,
            end_line=end,
            code="\n".join(lines[start - 1 : end]),
            language=_LANG_BY_EXT.get(ext),
        )

    async def _get_json(self, url: str, *, source: str) -> dict[str, Any]:
        resp = await self._request(url, source)
        data = resp.json()
        if not isinstance(data, dict):
            raise HubUnavailable(source, source="github")
        return data

    async def _get_text(self, url: str, *, source: str) -> str:
        return (await self._request(url, source)).text

    async def _request(self, url: str, source: str) -> httpx.Response:
        try:
            resp = await self._client.get(url)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise HubUnavailable(source, source="github") from exc
        if resp.status_code != 200:
            raise HubUnavailable(source, source="github")
        return resp


def _definition_end(lines: list[str], start: int) -> int:
    """1-indexed last line of the class/function beginning at `start`.

    `start` is the first line of the definition, which may be a decorator
    (`@auto_docstring(...)`). We skip past any leading decorators to the actual
    `class`/`def` line, then return the line before the *next* top-level
    definition (capped at _MAX_LINES) so the body is included.
    """
    n = len(lines)
    cap = min(n, start - 1 + _MAX_LINES)

    # Advance past leading decorators to the real class/def line.
    def_line = start
    for idx in range(start - 1, n):
        stripped = lines[idx].lstrip()
        if stripped.startswith(("class ", "def ", "async def ")):
            def_line = idx + 1
            break

    # From the line after the definition, find the next top-level definition.
    for idx in range(def_line, n):  # idx is 0-based; line number is idx + 1
        line = lines[idx]
        if line[:1] not in (" ", "\t", "") and line.startswith(
            ("class ", "def ", "async def ", "@")
        ):
            return min(idx, cap)  # body ends on the line before this one
    return cap
