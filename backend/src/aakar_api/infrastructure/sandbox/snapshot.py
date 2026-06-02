"""Trusted, code-free fetch of the files introspection needs from the Hub.

Downloading repo files executes nothing, so this runs in the API process. We
pull only what a meta-device build requires — config + any custom `*.py`
modeling/config code — and **never weights** (the meta device allocates none).
Hub errors are translated to the same domain errors the in-process loader uses.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, cast

from aakar_api.domain.exceptions import ModelGated, ModelNotFound

# Config + custom modeling/config Python only. Weights (*.safetensors, *.bin,
# *.pt, *.gguf, …) are intentionally excluded — the meta device needs none.
_ALLOW_PATTERNS = ["*.json", "*.py", "*.txt"]


class HubSnapshotFetcher:
    """Downloads a minimal model snapshot into a persistent cache directory."""

    def __init__(self, cache_dir: Path) -> None:
        self._cache_dir = cache_dir

    def fetch(self, model_id: str) -> Path:
        """Return the local snapshot dir (config + code, no weights)."""
        from huggingface_hub import snapshot_download

        self._cache_dir.mkdir(parents=True, exist_ok=True)
        try:
            path = snapshot_download(
                model_id,
                allow_patterns=_ALLOW_PATTERNS,
                cache_dir=str(self._cache_dir),
            )
        except Exception as exc:  # noqa: BLE001 — re-raised as a domain error
            raise _map_hub_error(model_id, exc) from exc
        # Absolute: the worker runs in a different cwd, and transformers must see
        # this as a local dir (not mis-parse a relative path as a repo id).
        return Path(path).resolve()

    def read_config(self, model_id: str) -> dict[str, Any]:
        """Parse `config.json` as plain JSON — no transformers, no code exec.

        Used to compute the cache key for a remote-code model without running
        any of its Python (loading it via `AutoConfig` would execute custom code).
        """
        from huggingface_hub import hf_hub_download

        self._cache_dir.mkdir(parents=True, exist_ok=True)
        try:
            config_path = hf_hub_download(
                model_id, "config.json", cache_dir=str(self._cache_dir)
            )
        except Exception as exc:  # noqa: BLE001 — re-raised as a domain error
            raise _map_hub_error(model_id, exc) from exc
        raw = json.loads(Path(config_path).read_text(encoding="utf-8"))
        return cast("dict[str, Any]", raw)


def _map_hub_error(model_id: str, exc: Exception) -> Exception:
    """Translate huggingface_hub errors to domain errors; pass others through."""
    from huggingface_hub.errors import (
        EntryNotFoundError,
        GatedRepoError,
        RepositoryNotFoundError,
    )

    if isinstance(exc, GatedRepoError):
        return ModelGated(model_id)
    if isinstance(exc, RepositoryNotFoundError | EntryNotFoundError):
        return ModelNotFound(model_id)
    return exc
