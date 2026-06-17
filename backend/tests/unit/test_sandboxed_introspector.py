"""Unit tests for `SandboxedIntrospector` — fakes only, no subprocess, no network.

Verifies the orchestration contract: the worker's JSON result is turned into a
Spec (or the right domain error), the `--operations` flag is threaded through, and
the worker is launched with a scrubbed, offline environment.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

import pytest

from aakar_api.domain.exceptions import (
    IntrospectionFailed,
    IntrospectionTimeout,
    UnsupportedArchitecture,
)
from aakar_api.domain.spec import Spec
from aakar_api.infrastructure.sandbox import SandboxResult
from aakar_api.infrastructure.sandboxed_introspector import SandboxedIntrospector

_SPEC_PAYLOAD: dict[str, Any] = {
    "model_id": "org/custom",
    "model_type": "custom",
    "config_summary": {},
    "graph": [{"id": "root", "type": "model", "label": "Root"}],
}


def _out_path(argv: list[str]) -> str:
    return argv[argv.index("--out") + 1]


class FakeFetcher:
    """Stands in for HubSnapshotFetcher — no network."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {"model_type": "custom", "architectures": ["FooModel"]}
        self.fetched: list[str] = []
        self.read: list[str] = []

    def fetch(self, model_id: str) -> Path:
        self.fetched.append(model_id)
        return Path(tempfile.mkdtemp(prefix="fake-snapshot-"))

    def read_config(self, model_id: str) -> dict[str, Any]:
        self.read.append(model_id)
        return self.config


class FakeRunner:
    """Simulates a SandboxRunner by writing the canned worker result to --out."""

    def __init__(
        self,
        *,
        payload: dict[str, Any] | None = None,
        write: bool = True,
        timed_out: bool = False,
        returncode: int = 0,
        stderr: str = "",
    ) -> None:
        self._payload = payload
        self._write = write
        self._timed_out = timed_out
        self._returncode = returncode
        self._stderr = stderr
        self.calls: list[dict[str, Any]] = []

    def run(self, argv, *, env, timeout_s, cwd=None) -> SandboxResult:
        self.calls.append(
            {"argv": list(argv), "env": dict(env), "timeout_s": timeout_s, "cwd": cwd}
        )
        if self._timed_out:
            return SandboxResult(returncode=-1, stdout="", stderr=self._stderr, timed_out=True)
        if self._write and self._payload is not None:
            Path(_out_path(list(argv))).write_text(
                json.dumps(self._payload), encoding="utf-8"
            )
        return SandboxResult(returncode=self._returncode, stdout="", stderr=self._stderr)


def _introspector(fetcher: FakeFetcher, runner: FakeRunner) -> SandboxedIntrospector:
    return SandboxedIntrospector(fetcher=fetcher, runner=runner, timeout_s=5.0)


async def test_ok_payload_becomes_validated_spec() -> None:
    runner = FakeRunner(payload={"ok": True, "spec": _SPEC_PAYLOAD})
    spec = await _introspector(FakeFetcher(), runner).introspect("org/custom")
    assert isinstance(spec, Spec)
    assert spec.model_id == "org/custom"
    assert spec.graph[0].label == "Root"


async def test_worker_env_is_scrubbed_and_offline() -> None:
    runner = FakeRunner(payload={"ok": True, "spec": _SPEC_PAYLOAD})
    await _introspector(FakeFetcher(), runner).introspect("org/custom")
    env = runner.calls[0]["env"]
    assert env["HF_HUB_OFFLINE"] == "1"
    assert env["TRANSFORMERS_OFFLINE"] == "1"
    # No secrets / parent env leak through (env is fully replaced).
    for leaked in ("HF_TOKEN", "AWS_SECRET_ACCESS_KEY", "OPENAI_API_KEY"):
        assert leaked not in env


async def test_unsupported_payload_raises_unsupported_architecture() -> None:
    runner = FakeRunner(
        payload={
            "ok": False,
            "kind": "unsupported_architecture",
            "model_id": "org/custom",
            "architecture": "FooModel",
        }
    )
    with pytest.raises(UnsupportedArchitecture) as ei:
        await _introspector(FakeFetcher(), runner).introspect("org/custom")
    assert ei.value.architecture == "FooModel"


async def test_failed_payload_raises_introspection_failed() -> None:
    runner = FakeRunner(payload={"ok": False, "kind": "introspection_failed", "message": "boom"})
    with pytest.raises(IntrospectionFailed):
        await _introspector(FakeFetcher(), runner).introspect("org/custom")


async def test_missing_result_file_raises_introspection_failed() -> None:
    # Worker crashed (e.g. segfault) → no result written.
    runner = FakeRunner(write=False, returncode=139, stderr="Segmentation fault")
    with pytest.raises(IntrospectionFailed):
        await _introspector(FakeFetcher(), runner).introspect("org/custom")


async def test_timeout_raises_introspection_timeout() -> None:
    runner = FakeRunner(timed_out=True)
    with pytest.raises(IntrospectionTimeout):
        await _introspector(FakeFetcher(), runner).introspect("org/custom")


async def test_introspect_omits_operations_flag() -> None:
    runner = FakeRunner(payload={"ok": True, "spec": _SPEC_PAYLOAD})
    await _introspector(FakeFetcher(), runner).introspect("org/custom")
    assert "--operations" not in runner.calls[0]["argv"]


async def test_introspect_with_operations_passes_flag() -> None:
    runner = FakeRunner(payload={"ok": True, "spec": _SPEC_PAYLOAD})
    await _introspector(FakeFetcher(), runner).introspect_with_operations("org/custom")
    assert "--operations" in runner.calls[0]["argv"]
