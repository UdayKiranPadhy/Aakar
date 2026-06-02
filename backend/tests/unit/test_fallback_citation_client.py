"""Tests for `FallbackCitationClient` — primary-wins, fallback-fills semantics."""

from __future__ import annotations

from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.domain.research import PaperMetrics
from aakar_api.infrastructure.fallback_citation_client import FallbackCitationClient


class StubCitations:
    def __init__(self, counts: dict[str, int] | None = None, *, raises: bool = False) -> None:
        self._counts = counts or {}
        self._raises = raises
        self.calls: list[list[str]] = []

    async def get_metrics(self, arxiv_ids: list[str]) -> dict[str, PaperMetrics]:
        self.calls.append(arxiv_ids)
        if self._raises:
            raise HubUnavailable("x", source="stub")
        return {
            k: PaperMetrics(citation_count=v) for k, v in self._counts.items() if k in arxiv_ids
        }


def _counts(metrics: dict[str, PaperMetrics]) -> dict[str, int | None]:
    return {k: m.citation_count for k, m in metrics.items()}


async def test_primary_wins_and_fallback_fills_missing() -> None:
    primary = StubCitations({"A": 1})
    fallback = StubCitations({"A": 999, "B": 2})
    client = FallbackCitationClient(primary=primary, fallback=fallback)

    result = await client.get_metrics(["A", "B"])

    assert _counts(result) == {"A": 1, "B": 2}  # primary's A wins; fallback supplies B
    assert fallback.calls == [["B"]]  # fallback only asked for the missing id


async def test_primary_throttled_falls_back_entirely() -> None:
    primary = StubCitations(raises=True)
    fallback = StubCitations({"A": 2, "B": 3})
    client = FallbackCitationClient(primary=primary, fallback=fallback)

    assert _counts(await client.get_metrics(["A", "B"])) == {"A": 2, "B": 3}


async def test_no_fallback_call_when_primary_covers_all() -> None:
    primary = StubCitations({"A": 1, "B": 2})
    fallback = StubCitations({"A": 9})
    client = FallbackCitationClient(primary=primary, fallback=fallback)

    assert _counts(await client.get_metrics(["A", "B"])) == {"A": 1, "B": 2}
    assert fallback.calls == []  # never consulted


async def test_both_sources_failing_yields_empty() -> None:
    client = FallbackCitationClient(
        primary=StubCitations(raises=True), fallback=StubCitations(raises=True)
    )
    assert await client.get_metrics(["A"]) == {}


async def test_empty_input_short_circuits() -> None:
    primary = StubCitations({"A": 1})
    client = FallbackCitationClient(primary=primary, fallback=StubCitations())
    assert await client.get_metrics([]) == {}
    assert primary.calls == []
