"""Tests for `HfHubClient` — httpx routes mocked with respx, no real network."""

from __future__ import annotations

import httpx
import pytest
import respx

from aakar_api.domain.exceptions import HubUnavailable, ModelGated, ModelNotFound
from aakar_api.infrastructure.hub_client import HfHubClient

_BASE = "https://hf.test"

_METADATA_JSON = {
    "id": "gpt2",
    "author": "openai-community",
    "lastModified": "2024-02-19T10:57:45.000Z",
    "gated": False,
    "downloads": 1_000_000,
    "likes": 2000,
    "library_name": "transformers",
    "pipeline_tag": "text-generation",
    "tags": ["pytorch", "gpt2", "arxiv:1910.09700"],
    "siblings": [
        {"rfilename": "config.json", "size": 665},
        {"rfilename": "model.safetensors", "size": 548_105_171},
    ],
    "cardData": {"license": "mit", "base_model": "gpt2"},
    "safetensors": {"parameters": {"F32": 124_439_808}, "total": 124_439_808},
}


@respx.mock
async def test_get_model_metadata_parses_and_maps_aliases() -> None:
    respx.get(f"{_BASE}/api/models/gpt2").mock(
        return_value=httpx.Response(200, json=_METADATA_JSON)
    )
    client = HfHubClient(endpoint=_BASE)
    try:
        info = await client.get_model_metadata("gpt2")
    finally:
        await client.aclose()

    assert info.model_id == "gpt2"  # from "id"
    assert info.last_modified == "2024-02-19T10:57:45.000Z"  # from "lastModified"
    assert info.downloads == 1_000_000
    assert "arxiv:1910.09700" in info.tags
    assert info.siblings[1].size == 548_105_171
    assert info.safetensors == {"parameters": {"F32": 124_439_808}, "total": 124_439_808}
    assert info.card_data is not None and info.card_data["base_model"] == "gpt2"


@respx.mock
async def test_metadata_serializes_to_snake_case() -> None:
    # FastAPI dumps with by_alias=True; validation_alias must NOT leak camelCase out.
    respx.get(f"{_BASE}/api/models/gpt2").mock(
        return_value=httpx.Response(200, json=_METADATA_JSON)
    )
    client = HfHubClient(endpoint=_BASE)
    try:
        info = await client.get_model_metadata("gpt2")
    finally:
        await client.aclose()

    dumped = info.model_dump(by_alias=True)
    assert "model_id" in dumped and "id" not in dumped
    assert "last_modified" in dumped and "lastModified" not in dumped
    assert "card_data" in dumped and "cardData" not in dumped


@respx.mock
async def test_404_maps_to_model_not_found() -> None:
    respx.get(f"{_BASE}/api/models/ghost").mock(return_value=httpx.Response(404))
    client = HfHubClient(endpoint=_BASE)
    try:
        with pytest.raises(ModelNotFound):
            await client.get_model_metadata("ghost")
    finally:
        await client.aclose()


@respx.mock
@pytest.mark.parametrize("status", [401, 403])
async def test_401_403_map_to_gated(status: int) -> None:
    respx.get(f"{_BASE}/api/models/private").mock(return_value=httpx.Response(status))
    client = HfHubClient(endpoint=_BASE)
    try:
        with pytest.raises(ModelGated):
            await client.get_model_metadata("private")
    finally:
        await client.aclose()


@respx.mock
async def test_5xx_maps_to_hub_unavailable() -> None:
    respx.get(f"{_BASE}/api/models/gpt2").mock(return_value=httpx.Response(503))
    client = HfHubClient(endpoint=_BASE)
    try:
        with pytest.raises(HubUnavailable):
            await client.get_model_metadata("gpt2")
    finally:
        await client.aclose()


@respx.mock
async def test_timeout_maps_to_hub_unavailable() -> None:
    respx.get(f"{_BASE}/api/models/gpt2").mock(side_effect=httpx.ConnectTimeout("slow"))
    client = HfHubClient(endpoint=_BASE)
    try:
        with pytest.raises(HubUnavailable):
            await client.get_model_metadata("gpt2")
    finally:
        await client.aclose()


@respx.mock
async def test_readme_404_returns_none() -> None:
    respx.get(f"{_BASE}/gpt2/resolve/main/README.md").mock(
        return_value=httpx.Response(404)
    )
    client = HfHubClient(endpoint=_BASE)
    try:
        assert await client.get_readme("gpt2") is None
    finally:
        await client.aclose()


@respx.mock
async def test_readme_returns_markdown() -> None:
    respx.get(f"{_BASE}/gpt2/resolve/main/README.md").mock(
        return_value=httpx.Response(200, text="# GPT-2\nHello")
    )
    client = HfHubClient(endpoint=_BASE)
    try:
        assert await client.get_readme("gpt2") == "# GPT-2\nHello"
    finally:
        await client.aclose()


@respx.mock
async def test_list_trending_parses_and_maps_sort() -> None:
    route = respx.get(f"{_BASE}/api/models").mock(
        return_value=httpx.Response(
            200,
            json=[
                {"id": "gpt2", "downloads": 100, "likes": 5, "pipeline_tag": "text-generation"},
                {"id": "bert-base-uncased", "downloads": 90},
            ],
        )
    )
    client = HfHubClient(endpoint=_BASE)
    try:
        items = await client.list_trending(sort="trending", limit=2)
    finally:
        await client.aclose()

    assert [i.model_id for i in items] == ["gpt2", "bert-base-uncased"]
    # "trending" must be translated to the Hub's actual param value.
    assert "trendingScore" in str(route.calls.last.request.url)
