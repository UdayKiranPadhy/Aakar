from __future__ import annotations

import os
from pathlib import Path

from lagom import Container, Singleton
from lagom.integrations.fast_api import FastApiIntegration

from aakar_api.application import (
    ArchitectureService,
    HubService,
    PaperService,
    RepoService,
    SourceService,
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
    OpenAlexClient,
    SandboxedIntrospector,
    SemanticScholarClient,
    SubprocessSandboxRunner,
    TransformersIntrospector,
)

_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_CACHE_ROOT = _REPO_ROOT / ".cache" / "specs"
_SANDBOX_HF_CACHE = _REPO_ROOT / ".cache" / "sandbox-hf"


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
    primary = c[TransformersIntrospector]
    sandbox = SandboxedIntrospector(
        fetcher=HubSnapshotFetcher(cache_dir=_SANDBOX_HF_CACHE),
        runner=SubprocessSandboxRunner(),
    )
    return FallbackIntrospector(
        primary, sandbox, allow_remote_code=_allow_remote_code()
    )


container = Container()

container[TransformersIntrospector] = Singleton(lambda c: TransformersIntrospector())
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

container[ArchitectureService] = Singleton(
    lambda c: ArchitectureService(c[FallbackIntrospector], c[DiskSpecCache])
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
