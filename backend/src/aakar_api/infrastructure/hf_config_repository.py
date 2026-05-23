"""HuggingFace Hub implementation of `ConfigRepository`.

Fetches `config.json` over HTTPS without authentication — Aakar v0.1 only
supports public models. Gated/private models raise `ModelGated` which the API
layer translates to a 403.
"""

from __future__ import annotations

import httpx

from aakar_api.application.interfaces import ConfigRepository
from aakar_api.domain.exceptions import (
    ConfigFetchTimeout,
    ModelGated,
    ModelNotFound,
)
from aakar_api.domain.model_config import ModelConfig

_DEFAULT_BASE_URL = "https://huggingface.co"
_DEFAULT_TIMEOUT_SECONDS = 5.0


class HFConfigRepository(ConfigRepository):
    """Fetches `config.json` from the public HuggingFace Hub."""

    def __init__(
        self,
        http_client: httpx.AsyncClient,
        base_url: str = _DEFAULT_BASE_URL,
        timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self._http = http_client
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds

    async def fetch(self, model_id: str) -> ModelConfig:
        url = f"{self._base_url}/{model_id}/resolve/main/config.json"
        try:
            response = await self._http.get(url, timeout=self._timeout, follow_redirects=True)
        except httpx.TimeoutException as exc:
            raise ConfigFetchTimeout(model_id) from exc

        if response.status_code == 404:
            raise ModelNotFound(model_id)
        if response.status_code in (401, 403):
            raise ModelGated(model_id)
        response.raise_for_status()

        return ModelConfig(raw=response.json())
