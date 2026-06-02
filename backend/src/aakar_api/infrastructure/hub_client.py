"""HuggingFace Hub HTTP client — the only module that speaks to the public Hub API.

Uses raw `httpx` against the documented REST endpoints (not `huggingface_hub.HfApi`,
which is sync and would need thread-wrapping) so we control error mapping exactly.
The base URL reuses `huggingface_hub.constants.ENDPOINT` rather than a hardcoded
string. This is the only place `httpx` is imported on the backend.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

from aakar_api.domain.exceptions import HubUnavailable, ModelGated, ModelNotFound
from aakar_api.domain.hub import HubModelInfo, HubTrendingItem

_DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

# Map Aakar's friendly sort values to the Hub API's actual query param values.
_SORT_MAP = {
    "trending": "trendingScore",
    "downloads": "downloads",
    "likes": "likes",
    "lastModified": "lastModified",
}


def _resolve_endpoint(endpoint: str | None) -> str:
    if endpoint is None:
        from huggingface_hub import constants

        endpoint = os.environ.get("HF_API_ENDPOINT") or constants.ENDPOINT
    return endpoint.rstrip("/")


class HfHubClient:
    """Async client for public Hub metadata, README, and model listings."""

    def __init__(
        self,
        *,
        endpoint: str | None = None,
        token: str | None = None,
        client: httpx.AsyncClient | None = None,
        timeout: httpx.Timeout = _DEFAULT_TIMEOUT,
    ) -> None:
        self._endpoint = _resolve_endpoint(endpoint)
        token = token or os.environ.get("HF_API_TOKEN")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        # `follow_redirects` matters: the README `resolve` URL 302s to a CDN.
        self._client = client or httpx.AsyncClient(
            timeout=timeout, headers=headers, follow_redirects=True
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def get_model_metadata(self, model_id: str) -> HubModelInfo:
        data = await self._get_json(
            f"/api/models/{model_id}", params={"blobs": "true"}, model_id=model_id
        )
        return HubModelInfo.model_validate(data)

    async def get_readme(self, model_id: str) -> str | None:
        url = f"{self._endpoint}/{model_id}/resolve/main/README.md"
        try:
            resp = await self._client.get(url)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise HubUnavailable(model_id) from exc
        if resp.status_code == 404:
            return None  # a missing model card is normal, not an error
        self._raise_for_status(resp, model_id)
        return resp.text

    async def get_paper(self, arxiv_id: str) -> dict[str, Any] | None:
        url = f"{self._endpoint}/api/papers/{arxiv_id}"
        try:
            resp = await self._client.get(url)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise HubUnavailable(arxiv_id, source="hf papers") from exc
        if resp.status_code == 404:
            return None  # paper not indexed on HF Papers — normal
        if resp.status_code != 200:
            raise HubUnavailable(arxiv_id, source="hf papers")
        data = resp.json()
        return data if isinstance(data, dict) else None

    async def list_trending(self, *, sort: str, limit: int) -> list[HubTrendingItem]:
        data = await self._get_json(
            "/api/models",
            params={
                "sort": _SORT_MAP.get(sort, sort),
                "direction": "-1",
                "limit": str(limit),
                "full": "true",
            },
            model_id="trending",
        )
        return [HubTrendingItem.model_validate(item) for item in data]

    async def _get_json(
        self, path: str, *, params: dict[str, str], model_id: str
    ) -> Any:
        try:
            resp = await self._client.get(f"{self._endpoint}{path}", params=params)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise HubUnavailable(model_id) from exc
        self._raise_for_status(resp, model_id)
        return resp.json()

    @staticmethod
    def _raise_for_status(resp: httpx.Response, model_id: str) -> None:
        code = resp.status_code
        if code == 404:
            raise ModelNotFound(model_id)
        if code in (401, 403):
            raise ModelGated(model_id)
        if code >= 500:
            raise HubUnavailable(model_id)
        resp.raise_for_status()
