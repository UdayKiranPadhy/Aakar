"""Infrastructure layer — concrete implementations of application interfaces."""

from aakar_api.infrastructure.arxiv_client import ArxivApiClient
from aakar_api.infrastructure.fallback_citation_client import FallbackCitationClient
from aakar_api.infrastructure.fallback_introspector import FallbackIntrospector
from aakar_api.infrastructure.github_client import GitHubApiClient
from aakar_api.infrastructure.hub_cache import InMemoryHubCache
from aakar_api.infrastructure.hub_client import HfHubClient
from aakar_api.infrastructure.lazy_introspector import LazyIntrospector
from aakar_api.infrastructure.openalex_client import OpenAlexClient
from aakar_api.infrastructure.paper_cache import InMemoryPaperCache
from aakar_api.infrastructure.redis_spec_cache import RedisSpecCache
from aakar_api.infrastructure.sandbox import HubSnapshotFetcher, SubprocessSandboxRunner
from aakar_api.infrastructure.sandboxed_introspector import SandboxedIntrospector
from aakar_api.infrastructure.semantic_scholar_client import SemanticScholarClient
from aakar_api.infrastructure.spec_cache import DiskSpecCache
from aakar_api.infrastructure.tiered_spec_cache import TieredSpecCache

# TransformersIntrospector is deliberately NOT re-exported here: importing it pulls in
# torch + transformers, and this package is imported at app startup via the DI root.
# The root imports it lazily instead (see di._build_introspector), so starting the API
# stays torch-free and the Hub-metadata endpoints don't wait on the ML stack. Import it
# directly from `aakar_api.infrastructure.transformers_introspector` where needed.

__all__ = [
    "ArxivApiClient",
    "DiskSpecCache",
    "FallbackCitationClient",
    "FallbackIntrospector",
    "GitHubApiClient",
    "HfHubClient",
    "HubSnapshotFetcher",
    "InMemoryHubCache",
    "InMemoryPaperCache",
    "LazyIntrospector",
    "OpenAlexClient",
    "RedisSpecCache",
    "SandboxedIntrospector",
    "SemanticScholarClient",
    "SubprocessSandboxRunner",
    "TieredSpecCache",
]
