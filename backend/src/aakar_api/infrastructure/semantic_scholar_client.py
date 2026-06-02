"""Semantic Scholar client — paper metrics via the keyless batch endpoint.

No API key is *required* (the Graph API is open); a key (`SEMANTIC_SCHOLAR_API_KEY`,
sent as `x-api-key`) only raises the shared rate limit. Because the keyless pool
throttles aggressively (HTTP 429), any non-200 is treated as "unavailable" so the
caller can fall back to another source.
"""

from __future__ import annotations

import os
import re
from typing import Any

import httpx

from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import PaperMetrics

_SS_BATCH = "https://api.semanticscholar.org/graph/v1/paper/batch"
_FIELDS = "citationCount,influentialCitationCount,tldr,fieldsOfStudy"
_DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_VERSION_SUFFIX = re.compile(r"v\d+$")


def _as_int(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


class SemanticScholarClient:
    """Fetches citation metrics (count, influential count, TLDR, fields) for a
    batch of arXiv ids."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        client: httpx.AsyncClient | None = None,
        timeout: httpx.Timeout = _DEFAULT_TIMEOUT,
    ) -> None:
        api_key = api_key or os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
        headers = {"x-api-key": api_key} if api_key else {}
        self._client = client or httpx.AsyncClient(
            timeout=timeout, headers=headers, follow_redirects=True
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def get_metrics(self, arxiv_ids: list[str]) -> dict[str, PaperMetrics]:
        if not arxiv_ids:
            return {}
        # Semantic Scholar wants "arXiv:<id>" without a version suffix.
        ids = [f"arXiv:{_VERSION_SUFFIX.sub('', a.strip())}" for a in arxiv_ids]
        joined = ",".join(arxiv_ids)
        try:
            resp = await self._client.post(
                _SS_BATCH, params={"fields": _FIELDS}, json={"ids": ids}
            )
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise HubUnavailable(joined, source="semantic scholar") from exc
        # 429 (throttled), 4xx, 5xx — all treated as "couldn't get data" so the
        # caller falls back rather than surfacing a 500 for optional enrichment.
        if resp.status_code != 200:
            raise HubUnavailable(joined, source="semantic scholar")
        return _map_metrics(arxiv_ids, resp.json())


def _map_metrics(arxiv_ids: list[str], payload: Any) -> dict[str, PaperMetrics]:
    # The batch endpoint returns a list aligned to the input order; null entries
    # are papers it couldn't find.
    out: dict[str, PaperMetrics] = {}
    if not isinstance(payload, list):
        return out
    for original, entry in zip(arxiv_ids, payload, strict=False):
        if not isinstance(entry, dict):
            continue
        tldr_obj = entry.get("tldr")
        fields = entry.get("fieldsOfStudy")
        out[original] = PaperMetrics(
            citation_count=_as_int(entry.get("citationCount")),
            influential_citation_count=_as_int(entry.get("influentialCitationCount")),
            tldr=tldr_obj.get("text") if isinstance(tldr_obj, dict) else None,
            fields_of_study=[f for f in fields if isinstance(f, str)]
            if isinstance(fields, list)
            else [],
        )
    return out
