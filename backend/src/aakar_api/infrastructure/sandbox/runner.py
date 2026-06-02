"""Run an untrusted command in an isolated child process.

`SandboxRunner` is the swappable isolation boundary. `SubprocessSandboxRunner`
is the local/dev tier: a separate process with a **fully replaced environment**
(no inherited secrets), CPU/core resource limits, its own process group (so a
runaway is killable as a unit), and a hard wall-clock timeout. It does not
inherit `os.environ` — only the env passed to `run()` exists in the child.

This is deliberately a *process* boundary, not a kernel/VM one. It cuts off
secret inheritance, bounds runaway CPU, and isolates crashes — but a determined
exploit shares the host kernel. The production tier is a hardened container
(`--network none`, `--read-only`, dropped caps, optionally gVisor); it would
implement this same `SandboxRunner` interface, so nothing above it changes.
"""

from __future__ import annotations

import contextlib
import os
import signal
import subprocess
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, runtime_checkable

# Keep diagnostic streams small — the real result travels via a file, not stdout.
_MAX_STREAM_CHARS = 8192


@dataclass(frozen=True)
class SandboxResult:
    """Outcome of one sandboxed command run."""

    returncode: int
    stdout: str
    stderr: str
    timed_out: bool = False


@runtime_checkable
class SandboxRunner(Protocol):
    """Executes `argv` in isolation with exactly `env` and a wall-clock cap."""

    def run(
        self,
        argv: Sequence[str],
        *,
        env: Mapping[str, str],
        timeout_s: float,
        cwd: Path | None = None,
    ) -> SandboxResult: ...


class SubprocessSandboxRunner:
    """Local isolation tier: scrubbed env + rlimits + killable process group."""

    def __init__(self, *, cpu_seconds: int = 120) -> None:
        self._cpu_seconds = cpu_seconds

    def run(
        self,
        argv: Sequence[str],
        *,
        env: Mapping[str, str],
        timeout_s: float,
        cwd: Path | None = None,
    ) -> SandboxResult:
        try:
            proc = subprocess.Popen(  # noqa: S603 — argv is built by us, not user input
                list(argv),
                env=dict(env),  # full replacement: nothing from os.environ leaks in
                cwd=str(cwd) if cwd else None,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                start_new_session=True,  # own process group → killable as a unit
                preexec_fn=self._apply_limits,  # noqa: PLW1509 — POSIX child setup
            )
        except Exception as exc:  # noqa: BLE001 — spawn failure is a sandbox failure
            return SandboxResult(returncode=-1, stdout="", stderr=f"spawn failed: {exc!r}")

        try:
            stdout, stderr = proc.communicate(timeout=timeout_s)
        except subprocess.TimeoutExpired:
            self._kill_group(proc)
            stdout, stderr = self._drain(proc)
            return SandboxResult(
                returncode=-1,
                stdout=_cap(stdout),
                stderr=_cap(stderr),
                timed_out=True,
            )

        return SandboxResult(
            returncode=proc.returncode,
            stdout=_cap(stdout),
            stderr=_cap(stderr),
        )

    def _apply_limits(self) -> None:
        """Child-side (post-fork) hardening. Best-effort; never block the run.

        Deliberately avoids RLIMIT_AS — torch reserves huge virtual address
        space and an AS cap spuriously kills it. Real memory capping is the
        container tier's job (cgroups); here CPU time is the backstop and the
        wall-clock timeout is the primary guard.
        """
        import resource

        for soft, hard, which in (
            (self._cpu_seconds, self._cpu_seconds + 5, resource.RLIMIT_CPU),
            (0, 0, resource.RLIMIT_CORE),  # no core dumps
        ):
            with contextlib.suppress(ValueError, OSError):
                resource.setrlimit(which, (soft, hard))

    @staticmethod
    def _kill_group(proc: subprocess.Popen[str]) -> None:
        with contextlib.suppress(ProcessLookupError, PermissionError):
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)

    @staticmethod
    def _drain(proc: subprocess.Popen[str]) -> tuple[str, str]:
        try:
            return proc.communicate(timeout=5)
        except Exception:  # noqa: BLE001 — diagnostics only
            return "", ""


def _cap(text: str | None) -> str:
    if not text:
        return ""
    return text if len(text) <= _MAX_STREAM_CHARS else text[:_MAX_STREAM_CHARS] + "…[truncated]"
