"""OpenAlex client — citation counts for arXiv papers (keyless, no API key).

arXiv mints a DataCite DOI `10.48550/arXiv.<id>` for papers (mostly 2022+), which
OpenAlex indexes. We look papers up by that DOI and read `cited_by_count`. Papers
without such a DOI (older preprints) simply won't be found — they're omitted from
the result rather than reported as zero. OpenAlex's "polite pool" (an optional
`OPENALEX_MAILTO`) gives generous, key-free rate limits.
"""

from __future__ import annotations

import os
import re
from typing import Any

import httpx

from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import PaperMetrics

_OPENALEX_API = "https://api.openalex.org/works"
_DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_DOI_PREFIX = "10.48550/arxiv."  # OpenAlex normalizes DOIs to lowercase
_VERSION_SUFFIX = re.compile(r"v\d+$")


def _base_id(arxiv_id: str) -> str:
    """Strip the version suffix: "2204.05149v3" → "2204.05149"."""
    return _VERSION_SUFFIX.sub("", arxiv_id.strip())


class OpenAlexClient:
    """Fetches `cited_by_count` for a batch of arXiv ids via their arXiv DOI."""

    def __init__(
        self,
        *,
        mailto: str | None = None,
        client: httpx.AsyncClient | None = None,
        timeout: httpx.Timeout = _DEFAULT_TIMEOUT,
    ) -> None:
        self._mailto = mailto or os.environ.get("OPENALEX_MAILTO")
        self._client = client or httpx.AsyncClient(timeout=timeout, follow_redirects=True)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def get_metrics(self, arxiv_ids: list[str]) -> dict[str, PaperMetrics]:
        # OpenAlex only supplies the citation count (its backstop role).
        # Map each base id back to the original id(s) the caller passed.
        base_to_orig: dict[str, list[str]] = {}
        for aid in arxiv_ids:
            base_to_orig.setdefault(_base_id(aid), []).append(aid)
        if not base_to_orig:
            return {}

        dois = "|".join(f"{_DOI_PREFIX}{base}" for base in base_to_orig)
        params = {"filter": f"doi:{dois}", "select": "doi,cited_by_count", "per-page": "200"}
        if self._mailto:
            params["mailto"] = self._mailto

        joined = ",".join(base_to_orig)
        try:
            resp = await self._client.get(_OPENALEX_API, params=params)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise HubUnavailable(joined, source="openalex") from exc
        # Any non-200 is treated as "unavailable" so citation enrichment degrades
        # gracefully (this client is also used as a fallback source).
        if resp.status_code != 200:
            raise HubUnavailable(joined, source="openalex")
        return _map_metrics(resp.json(), base_to_orig)


def _map_metrics(payload: Any, base_to_orig: dict[str, list[str]]) -> dict[str, PaperMetrics]:
    out: dict[str, PaperMetrics] = {}
    for work in payload.get("results", []):
        doi = (work.get("doi") or "").lower()
        if _DOI_PREFIX not in doi:
            continue
        base = doi.split(_DOI_PREFIX, 1)[1]
        cited = work.get("cited_by_count")
        if base in base_to_orig and isinstance(cited, int):
            for original in base_to_orig[base]:
                out[original] = PaperMetrics(citation_count=cited)
    return out
