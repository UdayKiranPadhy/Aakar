"""Redis-backed Spec cache — the durable, shared tier behind `DiskSpecCache`.

Why Redis on top of the disk cache: `DiskSpecCache` is local and ephemeral. On
most container / serverless platforms `backend/.cache/specs` is wiped on every
redeploy and is never shared between instances, so each cold start re-introspects
from scratch (the expensive step — building the nn.Module tree is ~3-30 s/model).
A shared Redis means one process's cold build warms the cache for *every* instance
and survives restarts.

Design choices, each load-bearing:

* **Same key scheme as `DiskSpecCache`** — `model_id · schema-version · config-hash`.
  Keying by `model_id` alone would drop two invalidations we rely on: the schema
  version (so old-shaped payloads are never served against new code) and the
  config hash (so a model's config edit / fork invalidates naturally). We reuse
  the disk cache's `_SPEC_SCHEMA_VERSION` / `_safe_model_id` so both tiers agree.
* **gzip values** — Spec JSON is highly repetitive (repeated keys, repeated layer
  subtrees) and compresses ~8-12×. That keeps each write well under serverless
  request-size caps and stretches a capped plan's dataset + bandwidth budget.
* **Fail-open** — any Redis fault (down, timeout, auth, corrupt payload) is treated
  as a miss / no-op. A cache outage may cost latency but must never raise a 5xx.
"""

from __future__ import annotations

import contextlib
import gzip
import logging
from typing import cast

import redis.asyncio as aioredis
from redis.exceptions import RedisError

from aakar_api.domain.spec import Spec
from aakar_api.infrastructure.spec_cache import _SPEC_SCHEMA_VERSION, _safe_model_id

_log = logging.getLogger(__name__)

# 60 days. Specs are ~immutable for a given (model, config), so the TTL exists to
# bound the dataset under a capped plan (LRU-style turnover), not for freshness.
_DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 60
_DEFAULT_PREFIX = "aakar:spec"


class RedisSpecCache:
    """`SpecCache` backed by Redis: gzip JSON values, composite key, fail-open."""

    def __init__(
        self,
        client: aioredis.Redis,
        *,
        ttl_seconds: int = _DEFAULT_TTL_SECONDS,
        prefix: str = _DEFAULT_PREFIX,
    ) -> None:
        self._client = client
        self._ttl = ttl_seconds
        self._prefix = prefix

    def _key(self, model_id: str, config_hash: str) -> str:
        # Mirrors DiskSpecCache._path: the schema version + config hash carry the
        # invalidation, so both cache tiers key entries identically.
        return (
            f"{self._prefix}:v{_SPEC_SCHEMA_VERSION}"
            f":{_safe_model_id(model_id)}:{config_hash[:12]}"
        )

    async def get(self, model_id: str, config_hash: str) -> Spec | None:
        key = self._key(model_id, config_hash)
        try:
            blob = await self._client.get(key)
        except (RedisError, OSError) as exc:
            _log.debug("redis get failed (%s) — treating as miss: %s", key, exc)
            return None
        if blob is None:
            return None
        # We never set decode_responses, so values come back as raw bytes.
        try:
            return Spec.model_validate_json(gzip.decompress(cast("bytes", blob)))
        except Exception as exc:  # noqa: BLE001 — any decode failure ⇒ stale/corrupt ⇒ miss
            # A payload written by older code / a different schema can't be parsed.
            # Drop it and report a miss so the caller re-introspects and overwrites.
            _log.warning("discarding undecodable cached spec (%s): %s", key, exc)
            with contextlib.suppress(RedisError, OSError):
                await self._client.delete(key)
            return None

    async def set(self, model_id: str, config_hash: str, spec: Spec) -> None:
        # Serialize outside the try: a serialization bug should surface, not be
        # silently swallowed as if it were a transport error.
        payload = gzip.compress(spec.model_dump_json().encode("utf-8"))
        try:
            await self._client.set(self._key(model_id, config_hash), payload, ex=self._ttl)
        except (RedisError, OSError) as exc:
            _log.debug("redis set failed — best-effort write skipped: %s", exc)
