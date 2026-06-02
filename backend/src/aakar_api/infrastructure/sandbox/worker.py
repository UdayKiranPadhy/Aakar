"""Sandbox worker — the ONLY place custom model code (`trust_remote_code=True`)
is ever executed.

Runs as a child process inside the sandbox:

    python -m aakar_api.infrastructure.sandbox.worker \
        --model-id <id> --snapshot <local_dir> --out <result.json>

It loads the config + model from a *local* snapshot (offline), builds it on the
meta device, walks the tree via the shared `build_spec`, and writes a JSON
result to ``--out``:

    {"ok": true,  "spec": { ... }}
    {"ok": false, "kind": "unsupported_architecture", "model_id": ..., "architecture": ...}
    {"ok": false, "kind": "introspection_failed", "message": "..."}

Exit code is 0 whenever a structured result is written. A hard crash (segfault,
OOM kill, timeout SIGKILL) leaves no/partial file — which the orchestrator reads
as failure. Because this is the trust boundary, the worker never lets an
exception escape; it serializes it instead.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any


def _build_spec_from_snapshot(model_id: str, snapshot_dir: str) -> Any:
    import transformers
    from transformers import AutoConfig

    from aakar_api.infrastructure.introspection.model_builder import (
        build_model_on_meta_device,
    )
    from aakar_api.infrastructure.introspection.spec_builder import build_spec

    config = AutoConfig.from_pretrained(
        snapshot_dir, trust_remote_code=True, local_files_only=True
    )
    arch_names = list(getattr(config, "architectures", None) or [])

    architecture_name: str | None = None
    factory = None
    # Prefer a stock transformers class if this architecture happens to be one.
    for name in arch_names:
        cls = getattr(transformers, name, None)
        if cls is not None:
            architecture_name, factory = name, cls
            break

    if factory is None:
        architecture_name = arch_names[0] if arch_names else "model"
        factory = _dynamic_factory(config, architecture_name, snapshot_dir)

    model = build_model_on_meta_device(config, factory)
    return build_spec(model_id, config, architecture_name or "model", model)


def _dynamic_factory(
    config: Any, architecture_name: str, snapshot_dir: str
) -> Callable[[Any], Any]:
    """Resolve the repo's custom model class from its local code.

    Prefer the exact class named in ``config.architectures`` (resolved from the
    snapshot's modeling file via ``auto_map``); fall back to ``AutoModel`` if we
    can't pinpoint it.
    """
    from transformers import AutoModel

    auto_map = getattr(config, "auto_map", None) or {}
    reference: str | None = None
    for value in auto_map.values():
        candidates = value if isinstance(value, list | tuple) else [value]
        for cand in candidates:
            if isinstance(cand, str) and cand.rsplit(".", 1)[-1] == architecture_name:
                reference = cand
                break
        if reference:
            break

    if reference:
        from transformers.dynamic_module_utils import get_class_from_dynamic_module

        model_cls = get_class_from_dynamic_module(reference, snapshot_dir)
        return lambda cfg: model_cls(cfg)

    return lambda cfg: AutoModel.from_config(cfg, trust_remote_code=True)  # type: ignore[no-untyped-call]


def _write(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Aakar sandbox introspection worker")
    parser.add_argument("--model-id", required=True)
    parser.add_argument("--snapshot", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args(argv)

    out = Path(args.out)
    from aakar_api.domain.exceptions import UnsupportedArchitecture

    try:
        try:
            spec = _build_spec_from_snapshot(args.model_id, args.snapshot)
        except UnsupportedArchitecture as exc:
            _write(
                out,
                {
                    "ok": False,
                    "kind": "unsupported_architecture",
                    "model_id": exc.model_id,
                    "architecture": exc.architecture,
                },
            )
            return 0
        _write(out, {"ok": True, "spec": json.loads(spec.model_dump_json())})
        return 0
    except Exception as exc:  # noqa: BLE001 — trust boundary: serialize, never raise
        _write(
            out,
            {
                "ok": False,
                "kind": "introspection_failed",
                "message": f"{type(exc).__name__}: {exc}",
            },
        )
        return 0


if __name__ == "__main__":
    sys.exit(main())
