"""Unit tests for config-loader error mapping — class-based, no message parsing.

The architecture name for an unsupported model is read from config.json *data*
(not the exception message), so these tests stub `hf_hub_download` to point at a
local config and assert the extraction.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from aakar_api.domain.exceptions import ModelGated, ModelNotFound
from aakar_api.infrastructure.introspection import config_loader
from aakar_api.infrastructure.introspection.config_loader import _declared_architecture, load_config


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


def test_gated_repo_wrapped_as_oserror_maps_to_model_gated(monkeypatch: pytest.MonkeyPatch) -> None:
    # transformers raises `OSError(...) from GatedRepoError`; verify it maps to
    # ModelGated, not ModelNotFound (the pre-fix regression).
    from unittest.mock import MagicMock

    from huggingface_hub.errors import GatedRepoError

    # GatedRepoError requires an HTTP response object; create a minimal subclass
    # that bypasses HfHubHTTPError.__init__ so isinstance checks still pass.
    class _FakeGatedRepoError(GatedRepoError):
        def __init__(self) -> None:
            Exception.__init__(self, "access restricted")

    cause = _FakeGatedRepoError()
    wrapped = OSError("You are trying to access a gated repo.")
    wrapped.__cause__ = cause

    def _raise(*_a: object, **_kw: object) -> None:
        raise wrapped

    import transformers
    monkeypatch.setattr(transformers.AutoConfig, "from_pretrained", _raise)
    with pytest.raises(ModelGated):
        load_config("org/gated-model")
