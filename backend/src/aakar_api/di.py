from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import certifi
import redis.asyncio as aioredis
from dotenv import load_dotenv
from lagom import Container, Singleton
from lagom.integrations.fast_api import FastApiIntegration

from aakar_api.application import (
    ArchitectureService,
    HubService,
    OperationsService,
    PaperService,
    RepoService,
    SourceService,
    SpecCache,
)
from aakar_api.infrastructure import (
    ArxivApiClient,
    DiskSpecCache,
    FallbackCitationClient,
    FallbackIntrospector,
    GitHubApiClient,
    HfHubClient,
    HubSnapshotFetcher,
    InMemoryHubCache,
    InMemoryPaperCache,
    LazyIntrospector,
    OpenAlexClient,
    RedisSpecCache,
    SandboxedIntrospector,
    SemanticScholarClient,
    SubprocessSandboxRunner,
    TieredSpecCache,
)

_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_CACHE_ROOT = _REPO_ROOT / ".cache" / "specs"
_SANDBOX_HF_CACHE = _REPO_ROOT / ".cache" / "sandbox-hf"

# Make backend/.env authoritative for the os.environ reads below (REDIS_URL,
# AAKAR_ALLOW_REMOTE_CODE, HF/CORS, …). override=False ⇒ real env still wins, so
# deploy-time config takes precedence; a missing .env file is a silent no-op.
load_dotenv(_REPO_ROOT / ".env")


def _allow_remote_code() -> bool:
    """Opt-in flag for sandboxed introspection of custom-code models.

    Default OFF: such models are refused (today's behavior). When set, they are
    introspected ONLY out-of-process via the sandbox — never in the API process.
    """
    return os.environ.get("AAKAR_ALLOW_REMOTE_CODE", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _build_introspector(c: Container) -> FallbackIntrospector:
    # Imported lazily (not at module top) so merely starting the API never pulls in
    # torch + transformers — only resolving this, on the first /architecture or
    # /operations request, pays that import. The Hub-metadata endpoints stay torch-free.
    from aakar_api.infrastructure.transformers_introspector import TransformersIntrospector

    primary = TransformersIntrospector()
    sandbox = SandboxedIntrospector(
        fetcher=HubSnapshotFetcher(cache_dir=_SANDBOX_HF_CACHE),
        runner=SubprocessSandboxRunner(),
    )
    return FallbackIntrospector(
        primary, sandbox, allow_remote_code=_allow_remote_code()
    )


def _redis_client(url: str) -> aioredis.Redis:
    """Pooled async Redis client with tight timeouts.

    Short timeouts are deliberate: a slow/unreachable Redis must fail *fast* so the
    lookup falls open to disk/introspection instead of adding latency. For TLS
    (`rediss://`, e.g. Upstash) we verify the server cert against certifi's CA
    bundle, so the connection doesn't depend on the OS trust store being present
    (it isn't for some Python builds and slim container images).
    """
    options: dict[str, Any] = {
        "socket_timeout": 1.0,
        "socket_connect_timeout": 2.0,
        "max_connections": 16,
    }
    if url.startswith("rediss://"):
        options["ssl_ca_certs"] = certifi.where()
    return aioredis.from_url(url, **options)


def _build_spec_cache(c: Container) -> SpecCache:
    """Disk cache alone, or local disk in front of a shared Redis tier.

    No `REDIS_URL` (local dev, tests, CI) ⇒ exactly today's disk-only behavior.
    With one set, reads hit local disk first and fall through to Redis (which
    survives redeploys and is shared across instances); writes go to both.
    """
    disk = c[DiskSpecCache]
    url = os.environ.get("REDIS_URL", "").strip()
    if not url:
        return disk
    ttl = os.environ.get("REDIS_SPEC_TTL_SECONDS")
    redis_cache = (
        RedisSpecCache(_redis_client(url), ttl_seconds=int(ttl))
        if ttl
        else RedisSpecCache(_redis_client(url))
    )
    return TieredSpecCache(primary=disk, secondary=redis_cache)


container = Container()

container[FallbackIntrospector] = Singleton(_build_introspector)
container[DiskSpecCache] = Singleton(lambda c: DiskSpecCache(root=_DEFAULT_CACHE_ROOT))
container[HfHubClient] = Singleton(lambda c: HfHubClient())
container[InMemoryHubCache] = Singleton(lambda c: InMemoryHubCache())
container[ArxivApiClient] = Singleton(lambda c: ArxivApiClient())
container[GitHubApiClient] = Singleton(lambda c: GitHubApiClient())
container[InMemoryPaperCache] = Singleton(lambda c: InMemoryPaperCache())
# Citation counts: Semantic Scholar first (best data), OpenAlex fallback when SS
# is rate-limited. Both keyless; see docs in each client.
container[FallbackCitationClient] = Singleton(
    lambda c: FallbackCitationClient(
        primary=SemanticScholarClient(),
        fallback=OpenAlexClient(),
    )
)

# One lazy wrapper shared by both services: it builds the real (torch-backed) introspector
# only on first use, so a request served entirely from cache never triggers the
# torch + transformers import. The services check the cache before ever calling it.
container[LazyIntrospector] = Singleton(
    lambda c: LazyIntrospector(lambda: c[FallbackIntrospector])
)
container[ArchitectureService] = Singleton(
    lambda c: ArchitectureService(c[LazyIntrospector], _build_spec_cache(c))
)
# Shares the SAME disk tier (a Singleton) and Redis backing store as the architecture
# service, so the in-place upgrade from structure-only to fully-traced is visible to both.
container[OperationsService] = Singleton(
    lambda c: OperationsService(c[LazyIntrospector], _build_spec_cache(c))
)
container[HubService] = Singleton(
    lambda c: HubService(c[HfHubClient], c[InMemoryHubCache])
)
container[PaperService] = Singleton(
    lambda c: PaperService(
        c[HubService],
        c[ArxivApiClient],
        c[FallbackCitationClient],
        c[InMemoryPaperCache],
    )
)
container[RepoService] = Singleton(
    lambda c: RepoService(c[HubService], c[GitHubApiClient])
)
container[SourceService] = Singleton(lambda c: SourceService(c[GitHubApiClient]))

deps = FastApiIntegration(container)
