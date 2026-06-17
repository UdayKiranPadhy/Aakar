"""End-to-end smoke test for the sandboxed introspection path.

Exercises the *real* machinery — `HubSnapshotFetcher` (live Hub) +
`SubprocessSandboxRunner` (a separate, env-scrubbed, offline child process) +
the worker building on the meta device and round-tripping a `Spec` back through
JSON. Uses gpt2 (stock, no remote code needed) so the test is deterministic;
the worker still runs with `trust_remote_code=True`, just like for a custom
model — gpt2 simply has none.

Opt-in via `pytest -m smoke` (needs network + downloads gpt2's config).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from aakar_api.domain.spec import Spec
from aakar_api.infrastructure.sandbox import HubSnapshotFetcher, SubprocessSandboxRunner
from aakar_api.infrastructure.sandboxed_introspector import SandboxedIntrospector

pytestmark = pytest.mark.smoke


async def test_sandboxed_introspection_gpt2_end_to_end(tmp_path: Path) -> None:
    introspector = SandboxedIntrospector(
        fetcher=HubSnapshotFetcher(cache_dir=tmp_path / "hf-cache"),
        runner=SubprocessSandboxRunner(),
        timeout_s=180.0,
    )

    spec = await introspector.introspect("gpt2")

    assert isinstance(spec, Spec)
    assert spec.model_id == "gpt2"
    assert spec.model_type == "gpt2"
    assert spec.graph, "expected a non-empty module graph"
    root = spec.graph[0]
    assert root.param_count and root.param_count > 0
    # The walk reached real submodules (transformer blocks, lm_head, …).
    assert root.children
