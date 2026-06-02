"""Tests for `GitHubApiClient` — repo metadata + source slicing, respx-mocked."""

from __future__ import annotations

import httpx
import pytest
import respx

from aakar_api.domain.exceptions import HubUnavailable
from aakar_api.infrastructure.github_client import GitHubApiClient

_RAW = (
    "https://raw.githubusercontent.com/huggingface/transformers/v5.9.0/"
    "src/transformers/models/gpt2/modeling_gpt2.py"
)
_BLOB = (
    "https://github.com/huggingface/transformers/blob/v5.9.0/"
    "src/transformers/models/gpt2/modeling_gpt2.py#L3"
)

_FILE = "\n".join(
    [
        "import torch",  # 1
        "",  # 2
        "class GPT2Attention(nn.Module):",  # 3
        "    def __init__(self):",  # 4
        "        super().__init__()",  # 5
        "        self.c = 1",  # 6
        "",  # 7
        "class GPT2Block(nn.Module):",  # 8
        "    pass",  # 9
    ]
)


@respx.mock
async def test_get_source_slices_the_definition() -> None:
    respx.get(_RAW).mock(return_value=httpx.Response(200, text=_FILE))
    client = GitHubApiClient()
    try:
        snippet = await client.get_source(_BLOB)
    finally:
        await client.aclose()

    assert snippet.owner == "huggingface"
    assert snippet.repo == "transformers"
    assert snippet.ref == "v5.9.0"
    assert snippet.path == "src/transformers/models/gpt2/modeling_gpt2.py"
    assert snippet.start_line == 3
    assert snippet.end_line == 7  # stops before the next top-level class (line 8)
    assert "class GPT2Attention" in snippet.code
    assert "class GPT2Block" not in snippet.code
    assert snippet.language == "python"


@respx.mock
async def test_get_source_honours_explicit_line_range() -> None:
    respx.get(_RAW).mock(return_value=httpx.Response(200, text=_FILE))
    client = GitHubApiClient()
    try:
        snippet = await client.get_source(_BLOB.replace("#L3", "#L3-L5"))
    finally:
        await client.aclose()
    assert (snippet.start_line, snippet.end_line) == (3, 5)


async def test_get_source_rejects_unparseable_url() -> None:
    client = GitHubApiClient()
    try:
        with pytest.raises(ValueError):
            await client.get_source("https://example.com/not/a/blob")
    finally:
        await client.aclose()


@respx.mock
async def test_get_source_non_200_maps_to_hub_unavailable() -> None:
    respx.get(_RAW).mock(return_value=httpx.Response(404))
    client = GitHubApiClient()
    try:
        with pytest.raises(HubUnavailable):
            await client.get_source(_BLOB)
    finally:
        await client.aclose()


@respx.mock
async def test_get_repo_maps_fields() -> None:
    respx.get("https://api.github.com/repos/huggingface/transformers").mock(
        return_value=httpx.Response(
            200,
            json={
                "full_name": "huggingface/transformers",
                "html_url": "https://github.com/huggingface/transformers",
                "description": "Transformers",
                "stargazers_count": 130000,
                "forks_count": 26000,
                "topics": ["nlp", "pytorch"],
                "license": {"spdx_id": "Apache-2.0"},
                "language": "Python",
                "pushed_at": "2026-05-01T00:00:00Z",
            },
        )
    )
    client = GitHubApiClient()
    try:
        repo = await client.get_repo("huggingface", "transformers")
    finally:
        await client.aclose()

    assert repo.full_name == "huggingface/transformers"
    assert repo.stars == 130000
    assert repo.forks == 26000
    assert repo.topics == ["nlp", "pytorch"]
    assert repo.license == "Apache-2.0"
    assert repo.language == "Python"


@respx.mock
async def test_get_repo_timeout_maps_to_hub_unavailable() -> None:
    respx.get("https://api.github.com/repos/foo/bar").mock(side_effect=httpx.ConnectTimeout("slow"))
    client = GitHubApiClient()
    try:
        with pytest.raises(HubUnavailable):
            await client.get_repo("foo", "bar")
    finally:
        await client.aclose()
