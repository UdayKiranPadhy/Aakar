"""Isolation primitives for introspecting models that require custom code.

The pieces here implement the "separate fetching from executing" design:
`HubSnapshotFetcher` does the *trusted* download (no code runs), and a
`SandboxRunner` executes the *untrusted* worker — which is the only place
`trust_remote_code=True` model code ever runs — in a locked-down child process.
"""

from aakar_api.infrastructure.sandbox.runner import (
    SandboxResult,
    SandboxRunner,
    SubprocessSandboxRunner,
)
from aakar_api.infrastructure.sandbox.snapshot import HubSnapshotFetcher

__all__ = [
    "HubSnapshotFetcher",
    "SandboxResult",
    "SandboxRunner",
    "SubprocessSandboxRunner",
]
