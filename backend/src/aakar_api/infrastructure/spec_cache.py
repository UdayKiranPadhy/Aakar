"""Disk-backed cache of introspected Specs.

Building the nn.Module tree for a real model takes ~3-30 s depending on the
parameter count, so a single warm-cache hit is the difference between an
instant page render and a noticeable delay. The cache is keyed by the model
id plus a hash of the raw `config.json` — fine-tuned forks or config edits
invalidate naturally without manual eviction.

File layout: `<root>/<model_id_safe>.v<schema>.<config_hash[:12]>.json` containing
one `Spec.model_dump_json()` payload. All I/O runs in `asyncio.to_thread`.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
from pathlib import Path
from typing import Any

from aakar_api.domain.spec import Spec

_DEFAULT_ROOT = Path("backend/.cache/specs")

# Bump whenever the Spec *shape* changes (a new field, a changed meaning). The config hash
# invalidates on model/config edits, but not on code changes that alter what we emit — so the
# schema version is part of the key, ensuring old payloads are never served against new code.
#   v2: added the fact-based `Node.role`.
_SPEC_SCHEMA_VERSION = 2


def _safe_model_id(model_id: str) -> str:
    return model_id.replace("/", "__")


def hash_config(raw_config: dict[str, Any]) -> str:
    """sha256 of the canonicalized config dict. First 12 hex chars used as a key."""
    blob = json.dumps(raw_config, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


class DiskSpecCache:
    """File-backed Spec cache."""

    def __init__(self, root: Path = _DEFAULT_ROOT) -> None:
        self._root = root

    async def get(self, model_id: str, config_hash: str) -> Spec | None:
        return await asyncio.to_thread(self._get_sync, model_id, config_hash)

    async def set(self, model_id: str, config_hash: str, spec: Spec) -> None:
        await asyncio.to_thread(self._set_sync, model_id, config_hash, spec)

    def _path(self, model_id: str, config_hash: str) -> Path:
        return (
            self._root
            / f"{_safe_model_id(model_id)}.v{_SPEC_SCHEMA_VERSION}.{config_hash[:12]}.json"
        )

    def _get_sync(self, model_id: str, config_hash: str) -> Spec | None:
        path = self._path(model_id, config_hash)
        if not path.is_file():
            return None
        return Spec.model_validate_json(path.read_text(encoding="utf-8"))

    def _set_sync(self, model_id: str, config_hash: str, spec: Spec) -> None:
        path = self._path(model_id, config_hash)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(spec.model_dump_json(), encoding="utf-8")
