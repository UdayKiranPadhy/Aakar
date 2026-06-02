"""Tests for `SemanticScholarClient` — keyless batch metrics, respx-mocked."""

from __future__ import annotations

import httpx
import pytest
import respx

from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.infrastructure.semantic_scholar_client import SemanticScholarClient

_BATCH = "https://api.semanticscholar.org/graph/v1/paper/batch"


@respx.mock
async def test_batch_maps_full_metrics_and_skips_nulls() -> None:
    respx.post(_BATCH).mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "citationCount": 178362,
                    "influentialCitationCount": 19916,
                    "tldr": {"text": "Attention is all you need."},
                    "fieldsOfStudy": ["Computer Science"],
                },
                None,  # not found
            ],
        )
    )
    client = SemanticScholarClient()
    try:
        metrics = await client.get_metrics(["1706.03762v7", "0000.00000"])
    finally:
        await client.aclose()

    assert set(metrics) == {"1706.03762v7"}  # keyed by original id, null skipped
    m = metrics["1706.03762v7"]
    assert m.citation_count == 178362
    assert m.influential_citation_count == 19916
    assert m.tldr == "Attention is all you need."
    assert m.fields_of_study == ["Computer Science"]


@respx.mock
async def test_sends_arxiv_prefixed_ids_without_version() -> None:
    route = respx.post(_BATCH).mock(return_value=httpx.Response(200, json=[{"citationCount": 1}]))
    client = SemanticScholarClient()
    try:
        await client.get_metrics(["2204.05149v3"])
    finally:
        await client.aclose()
    import json

    sent = json.loads(route.calls.last.request.content)
    assert sent == {"ids": ["arXiv:2204.05149"]}  # version stripped, arXiv: prefix


@respx.mock
async def test_429_maps_to_hub_unavailable() -> None:
    respx.post(_BATCH).mock(return_value=httpx.Response(429, text="Too Many Requests"))
    client = SemanticScholarClient()
    try:
        with pytest.raises(HubUnavailable):
            await client.get_metrics(["1706.03762"])
    finally:
        await client.aclose()


@respx.mock
async def test_timeout_maps_to_hub_unavailable() -> None:
    respx.post(_BATCH).mock(side_effect=httpx.ConnectTimeout("slow"))
    client = SemanticScholarClient()
    try:
        with pytest.raises(HubUnavailable):
            await client.get_metrics(["1706.03762"])
    finally:
        await client.aclose()


@respx.mock
async def test_empty_input_makes_no_request() -> None:
    client = SemanticScholarClient()
    try:
        assert await client.get_metrics([]) == {}
    finally:
        await client.aclose()


@respx.mock
async def test_api_key_sent_as_header_when_present() -> None:
    route = respx.post(_BATCH).mock(return_value=httpx.Response(200, json=[{"citationCount": 5}]))
    client = SemanticScholarClient(api_key="secret-key")
    try:
        await client.get_metrics(["1706.03762"])
    finally:
        await client.aclose()
    assert route.calls.last.request.headers.get("x-api-key") == "secret-key"
