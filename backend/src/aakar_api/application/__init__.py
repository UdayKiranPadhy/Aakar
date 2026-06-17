"""Application layer — use cases. Depends on Domain + abstractions only."""

from aakar_api.application.architecture_service import ArchitectureService
from aakar_api.application.hub_service import HubService
from aakar_api.application.interfaces import (
    ArxivClient,
    CitationClient,
    GitHubClient,
    HubMetadataCache,
    HubMetadataClient,
    Introspector,
    PaperCache,
    SpecCache,
)
from aakar_api.application.operations_service import OperationsService
from aakar_api.application.paper_service import PaperService
from aakar_api.application.repo_service import RepoService
from aakar_api.application.source_service import SourceService

__all__ = [
    "ArchitectureService",
    "ArxivClient",
    "CitationClient",
    "GitHubClient",
    "HubService",
    "HubMetadataCache",
    "HubMetadataClient",
    "Introspector",
    "OperationsService",
    "PaperCache",
    "PaperService",
    "RepoService",
    "SourceService",
    "SpecCache",
]
