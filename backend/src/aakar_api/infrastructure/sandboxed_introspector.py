"""`Introspector` that runs custom model code in a sandbox instead of in-process.

Orchestration only — it owns no isolation logic itself:

  1. `HubSnapshotFetcher` pulls the repo's config + code (trusted, no exec).
  2. a `SandboxRunner` executes the worker against that snapshot, fully offline,
     with a scrubbed environment — the one place `trust_remote_code` code runs.
  3. the worker's JSON result is parsed back into a validated `Spec`.

`fetch_config_hash` deliberately does **not** go through the sandbox: it hashes
the raw `config.json` bytes (plain JSON, no transformers, no code exec), so the
Spec cache key is cheap and the expensive sandbox run happens only on a miss.
"""

from __future__ import annotations

import asyncio
import json
import sys
import tempfile
from collections.abc import Mapping
from pathlib import Path
from typing import Any, cast

from aakar_api.domain.exceptions import (
    IntrospectionFailed,
    IntrospectionTimeout,
    UnsupportedArchitecture,
)
from aakar_api.domain.spec import Spec
from aakar_api.infrastructure.sandbox import HubSnapshotFetcher, SandboxRunner
from aakar_api.infrastructure.spec_cache import hash_config

_WORKER_MODULE = "aakar_api.infrastructure.sandbox.worker"


class SandboxedIntrospector:
    """Introspect remote-code models by executing them inside a `SandboxRunner`."""

    def __init__(
        self,
        *,
        fetcher: HubSnapshotFetcher,
        runner: SandboxRunner,
        timeout_s: float = 90.0,
        python_executable: str | None = None,
    ) -> None:
        self._fetcher = fetcher
        self._runner = runner
        self._timeout_s = timeout_s
        # The interpreter that runs the worker. Defaults to the current venv's,
        # which already has aakar_api + transformers importable.
        self._python = python_executable or sys.executable

    # `token` is accepted to satisfy the Introspector Protocol but deliberately
    # ignored: the sandbox runs offline with a scrubbed env (no credentials),
    # so gated custom-code repos remain out of scope.
    async def fetch_config_hash(self, model_id: str, *, token: str | None = None) -> str:
        raw = await asyncio.to_thread(self._fetcher.read_config, model_id)
        return hash_config(raw)

    async def introspect(self, model_id: str, *, token: str | None = None) -> Spec:
        return await asyncio.to_thread(self._introspect_sync, model_id)

    def _introspect_sync(self, model_id: str) -> Spec:
        snapshot_dir = self._fetcher.fetch(model_id)

        # Per-call ephemeral workspace: the worker's HF_HOME (writable, for the
        # custom-code module cache) and the result file. Discarded on exit.
        with tempfile.TemporaryDirectory(prefix="aakar-sandbox-") as work:
            work_dir = Path(work)
            out_path = work_dir / "result.json"
            argv = [
                self._python,
                "-m",
                _WORKER_MODULE,
                "--model-id",
                model_id,
                "--snapshot",
                str(snapshot_dir),
                "--out",
                str(out_path),
            ]
            result = self._runner.run(
                argv,
                env=self._worker_env(work_dir),
                timeout_s=self._timeout_s,
                cwd=work_dir,
            )

            if result.timed_out:
                raise IntrospectionTimeout(model_id, timeout_s=self._timeout_s)

            payload = self._read_result(out_path)
            if payload is None:
                raise IntrospectionFailed(
                    model_id,
                    detail=_diagnostic(result.returncode, result.stderr),
                )

            return self._payload_to_spec(model_id, payload)

    def _payload_to_spec(self, model_id: str, payload: dict[str, Any]) -> Spec:
        if payload.get("ok"):
            # Untrusted output is still untrusted — re-validate through Pydantic.
            return Spec.model_validate(payload["spec"])

        kind = payload.get("kind")
        if kind == "unsupported_architecture":
            raise UnsupportedArchitecture(model_id, payload.get("architecture"))
        raise IntrospectionFailed(model_id, detail=payload.get("message"))

    @staticmethod
    def _read_result(out_path: Path) -> dict[str, Any] | None:
        if not out_path.is_file():
            return None
        try:
            return cast("dict[str, Any]", json.loads(out_path.read_text(encoding="utf-8")))
        except (ValueError, OSError):
            return None

    def _worker_env(self, work_dir: Path) -> Mapping[str, str]:
        """A minimal, secret-free environment for the worker.

        Fully replaces the parent env (no HF_TOKEN, no cloud creds). Forces
        offline so phase 2 can't reach the network, and points caches at the
        ephemeral workspace.
        """
        return {
            "PATH": "/usr/bin:/bin",
            "HOME": str(work_dir),
            "HF_HOME": str(work_dir / "hf"),
            "HF_HUB_OFFLINE": "1",
            "TRANSFORMERS_OFFLINE": "1",
            "HF_HUB_DISABLE_TELEMETRY": "1",
            "TOKENIZERS_PARALLELISM": "false",
            "OMP_NUM_THREADS": "1",
            "MKL_NUM_THREADS": "1",
            "PYTHONUNBUFFERED": "1",
            "PYTHONDONTWRITEBYTECODE": "1",
        }


def _diagnostic(returncode: int, stderr: str) -> str:
    tail = stderr.strip().splitlines()[-1] if stderr.strip() else ""
    base = f"worker exited {returncode} with no result"
    return f"{base} ({tail})" if tail else base
