"""Composite CitationClient — try a primary source, fall back to a secondary.

Combines Semantic Scholar (best data, but rate-limited) with OpenAlex (reliable).
The primary's counts win; the fallback only fills ids the primary didn't return
(because it was throttled or had no record). Never raises — a total failure
yields an empty mapping so citation enrichment degrades quietly.
"""

from __future__ import annotations

from aakar_api.application.interfaces import CitationClient
from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import PaperMetrics


class FallbackCitationClient:
    def __init__(self, *, primary: CitationClient, fallback: CitationClient) -> None:
        self._primary = primary
        self._fallback = fallback

    async def get_metrics(self, arxiv_ids: list[str]) -> dict[str, PaperMetrics]:
        if not arxiv_ids:
            return {}
        try:
            metrics = await self._primary.get_metrics(arxiv_ids)
        except HubUnavailable:
            metrics = {}
        missing = [aid for aid in arxiv_ids if aid not in metrics]
        if not missing:
            return metrics
        try:
            filled = await self._fallback.get_metrics(missing)
        except HubUnavailable:
            filled = {}
        return {**filled, **metrics}  # primary takes precedence on any overlap
