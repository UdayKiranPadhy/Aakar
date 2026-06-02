"""Tests for `ArxivApiClient` — Atom feed parsing + error mapping, respx-mocked."""

from __future__ import annotations

import httpx
import pytest
import respx

from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.infrastructure.arxiv_client import ArxivApiClient

_ARXIV = "https://export.arxiv.org/api/query"

_ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/1706.03762v7</id>
    <updated>2023-08-02T00:41:18Z</updated>
    <published>2017-06-12T17:57:34Z</published>
    <title>Attention Is All You Need</title>
    <summary>  The dominant sequence transduction models are based on complex
recurrent or convolutional neural networks.  </summary>
    <author><name>Ashish Vaswani</name></author>
    <author><name>Noam Shazeer</name></author>
    <arxiv:comment>15 pages, 5 figures</arxiv:comment>
    <arxiv:doi>10.0000/xyz</arxiv:doi>
    <link href="http://arxiv.org/abs/1706.03762v7" rel="alternate"/>
    <link title="pdf" href="http://arxiv.org/pdf/1706.03762v7" rel="related"/>
    <arxiv:primary_category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>
"""

_EMPTY = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"></feed>
"""


@respx.mock
async def test_parses_entry_fields() -> None:
    respx.get(_ARXIV).mock(return_value=httpx.Response(200, text=_ATOM))
    client = ArxivApiClient()
    try:
        papers = await client.get_papers(["1706.03762"])
    finally:
        await client.aclose()

    assert len(papers) == 1
    p = papers[0]
    assert p.arxiv_id == "1706.03762v7"
    assert p.title == "Attention Is All You Need"
    assert "complex recurrent" in p.summary  # whitespace collapsed
    assert p.authors == ["Ashish Vaswani", "Noam Shazeer"]
    assert p.categories == ["cs.CL", "cs.LG"]
    assert p.primary_category == "cs.CL"
    assert p.pdf_url.endswith("pdf/1706.03762v7")
    assert p.abs_url.endswith("abs/1706.03762v7")
    assert p.comment == "15 pages, 5 figures"
    assert p.doi == "10.0000/xyz"


@respx.mock
async def test_invalid_ids_short_circuit_without_request() -> None:
    # No route registered: if an HTTP call were made, respx would fail it.
    client = ArxivApiClient()
    try:
        assert await client.get_papers(["not a real id!!", ""]) == []
    finally:
        await client.aclose()


@respx.mock
async def test_empty_feed_returns_empty() -> None:
    respx.get(_ARXIV).mock(return_value=httpx.Response(200, text=_EMPTY))
    client = ArxivApiClient()
    try:
        assert await client.get_papers(["1706.03762"]) == []
    finally:
        await client.aclose()


@respx.mock
async def test_5xx_maps_to_hub_unavailable() -> None:
    respx.get(_ARXIV).mock(return_value=httpx.Response(503))
    client = ArxivApiClient()
    try:
        with pytest.raises(HubUnavailable):
            await client.get_papers(["1706.03762"])
    finally:
        await client.aclose()


@respx.mock
async def test_timeout_maps_to_hub_unavailable() -> None:
    respx.get(_ARXIV).mock(side_effect=httpx.ConnectTimeout("slow"))
    client = ArxivApiClient()
    try:
        with pytest.raises(HubUnavailable):
            await client.get_papers(["1706.03762"])
    finally:
        await client.aclose()
