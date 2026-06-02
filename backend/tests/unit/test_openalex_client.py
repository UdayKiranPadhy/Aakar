"""Tests for `OpenAlexClient` — citation lookup + arXiv-DOI mapping, respx-mocked."""

from __future__ import annotations

import httpx
import pytest
import respx

from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.infrastructure.openalex_client import OpenAlexClient

_OPENALEX = "https://api.openalex.org/works"


def _results(*works: dict[str, object]) -> dict[str, object]:
    return {"results": list(works)}


@respx.mock
async def test_maps_doi_to_citation_count() -> None:
    respx.get(_OPENALEX).mock(
        return_value=httpx.Response(
            200,
            json=_results(
                {"doi": "https://doi.org/10.48550/arxiv.2204.05149", "cited_by_count": 42}
            ),
        )
    )
    client = OpenAlexClient()
    try:
        metrics = await client.get_metrics(["2204.05149"])
    finally:
        await client.aclose()
    assert metrics["2204.05149"].citation_count == 42


@respx.mock
async def test_strips_version_but_keys_by_original_id() -> None:
    respx.get(_OPENALEX).mock(
        return_value=httpx.Response(
            200,
            json=_results(
                {"doi": "https://doi.org/10.48550/arxiv.2204.05149", "cited_by_count": 7}
            ),
        )
    )
    client = OpenAlexClient()
    try:
        metrics = await client.get_metrics(["2204.05149v3"])
    finally:
        await client.aclose()
    assert "2204.05149v3" in metrics  # keyed by the id the caller passed
    assert metrics["2204.05149v3"].citation_count == 7


@respx.mock
async def test_missing_paper_is_omitted_not_zero() -> None:
    respx.get(_OPENALEX).mock(return_value=httpx.Response(200, json=_results()))
    client = OpenAlexClient()
    try:
        metrics = await client.get_metrics(["1706.03762"])
    finally:
        await client.aclose()
    assert metrics == {}  # absent, never a misleading 0


@respx.mock
async def test_empty_input_makes_no_request() -> None:
    client = OpenAlexClient()
    try:
        assert await client.get_metrics([]) == {}
    finally:
        await client.aclose()


@respx.mock
async def test_5xx_maps_to_hub_unavailable() -> None:
    respx.get(_OPENALEX).mock(return_value=httpx.Response(502))
    client = OpenAlexClient()
    try:
        with pytest.raises(HubUnavailable):
            await client.get_metrics(["2204.05149"])
    finally:
        await client.aclose()


@respx.mock
async def test_timeout_maps_to_hub_unavailable() -> None:
    respx.get(_OPENALEX).mock(side_effect=httpx.ConnectTimeout("slow"))
    client = OpenAlexClient()
    try:
        with pytest.raises(HubUnavailable):
            await client.get_metrics(["2204.05149"])
    finally:
        await client.aclose()
