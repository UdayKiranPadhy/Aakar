"""Disk-backed cache of introspected Specs.

Building the nn.Module tree for a real model takes ~3-30 s depending on the
parameter count, so a single warm-cache hit is the difference between an instant
page render and a noticeable delay. The cache is keyed by the model id alone
(plus a schema version): a warm hit then costs nothing but a local file read,
with no Hub round-trip to compute a content key first.

File layout: `<root>/<model_id_safe>.v<schema>.json` containing one
`Spec.model_dump_json()` payload. All I/O runs in `asyncio.to_thread`.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from aakar_api.domain.spec import Spec

_DEFAULT_ROOT = Path("backend/.cache/specs")

# Bump whenever the Spec *shape* or its *meaning* changes, so payloads written by old
# code are never served against new code. Since the key is model-id-only, this version
# is the sole structural invalidator (a model whose config is edited in place is bounded
# by the Redis TTL, not invalidated instantly — acceptable for a study tool).
#   v2: added the fact-based `Node.role`.
#   v3: added `Node.operations` (per-module forward ops from the FX/fake-tensor trace).
#   v4: trace runs device-uniformly (meta), so MoE / buffer-heavy models now emit ops too.
#   v5: operations split into a separate /operations call. /architecture now caches a
#       structure-only Spec (`operations_traced=False`); the key dropped the config hash.
#   v6: per-module weight_dtype/bias_dtype, curated role-scoped config facts in
#       Node.params, structured Node.flops_detail, and Spec.rope_parameters.
#   v7: Node.params is now a generic dump of all public module attributes (was a
#       curated whitelist); walk_context picks up the `num_experts` config key.
_SPEC_SCHEMA_VERSION = 7


def _safe_model_id(model_id: str) -> str:
    return model_id.replace("/", "__")


class DiskSpecCache:
    """File-backed Spec cache, keyed by model id + schema version."""

    def __init__(self, root: Path = _DEFAULT_ROOT) -> None:
        self._root = root

    async def get(self, model_id: str) -> Spec | None:
        return await asyncio.to_thread(self._get_sync, model_id)

    async def set(self, model_id: str, spec: Spec) -> None:
        await asyncio.to_thread(self._set_sync, model_id, spec)

    def _path(self, model_id: str) -> Path:
        return self._root / f"{_safe_model_id(model_id)}.v{_SPEC_SCHEMA_VERSION}.json"

    def _get_sync(self, model_id: str) -> Spec | None:
        path = self._path(model_id)
        if not path.is_file():
            return None
        return Spec.model_validate_json(path.read_text(encoding="utf-8"))

    def _set_sync(self, model_id: str, spec: Spec) -> None:
        path = self._path(model_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(spec.model_dump_json(), encoding="utf-8")
