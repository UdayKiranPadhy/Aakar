"""Unit tests for config-loader error mapping — class-based, no message parsing.

The architecture name for an unsupported model is read from config.json *data*
(not the exception message), so these tests stub `hf_hub_download` to point at a
local config and assert the extraction.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aakar_api.infrastructure.introspection import config_loader
from aakar_api.infrastructure.introspection.config_loader import _declared_architecture


def _stub_config(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, payload: dict | None) -> None:
    if payload is None:
        def _raise(*_args: object, **_kwargs: object) -> str:
            raise FileNotFoundError("not cached")

        monkeypatch.setattr("huggingface_hub.hf_hub_download", _raise)
        return
    cfg = tmp_path / "config.json"
    cfg.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr("huggingface_hub.hf_hub_download", lambda *_a, **_k: str(cfg))


def test_architecture_name_from_model_type(monkeypatch, tmp_path) -> None:
    _stub_config(monkeypatch, tmp_path, {"model_type": "deepseek_v3"})
    assert _declared_architecture("org/m") == "deepseek_v3"


def test_architecture_name_falls_back_to_architectures(monkeypatch, tmp_path) -> None:
    _stub_config(monkeypatch, tmp_path, {"architectures": ["LongCatVideoModel"]})
    assert _declared_architecture("org/m") == "LongCatVideoModel"


def test_no_model_type_or_architectures_yields_none(monkeypatch, tmp_path) -> None:
    # e.g. a non-text model whose config has neither key (the LongCat case).
    _stub_config(monkeypatch, tmp_path, {"some_other_key": 1})
    assert _declared_architecture("org/m") is None


def test_unreadable_config_is_best_effort_none(monkeypatch, tmp_path) -> None:
    _stub_config(monkeypatch, tmp_path, None)  # download raises
    assert _declared_architecture("org/m") is None


def test_module_no_longer_parses_exception_messages() -> None:
    # Guard against regressing back to message/regex matching.
    assert not hasattr(config_loader, "_map_config_value_error")
    assert not hasattr(config_loader, "_MODEL_TYPE_RE")
