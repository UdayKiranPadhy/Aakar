"""Load HuggingFace configs and translate third-party errors to domain errors."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from aakar_api.domain.exceptions import ModelGated, ModelNotFound, UnsupportedArchitecture
from aakar_api.infrastructure.spec_cache import hash_config


def load_config(model_id: str) -> Any:
    from huggingface_hub.errors import (
        EntryNotFoundError,
        GatedRepoError,
        RepositoryNotFoundError,
    )
    from transformers import AutoConfig

    try:
        # NEVER True here: Models that need custom code are refused at this step 
        # and (when opted in) handled out-of-process
        # by SandboxedIntrospector — see infrastructure/sandbox/.
        return AutoConfig.from_pretrained(model_id, trust_remote_code=False)
    except GatedRepoError as exc:
        raise ModelGated(model_id) from exc
    except (RepositoryNotFoundError, EntryNotFoundError) as exc:
        raise ModelNotFound(model_id) from exc
    except ValueError as exc:
        raise UnsupportedArchitecture(model_id, _declared_architecture(model_id)) from exc
    except OSError as exc:
        raise ModelNotFound(model_id) from exc


def config_hash(config: Any) -> str:
    return hash_config(config.to_dict())


def _declared_architecture(model_id: str) -> str | None:
    """Best-effort architecture name from the model's (already-cached) config.json.

    `AutoConfig` has just read this file, so it's in the local HF cache — we read
    it offline rather than parsing the exception message. Returns None when
    neither `model_type` nor `architectures` is present (e.g. a non-text model).
    """
    try:
        from huggingface_hub import hf_hub_download

        path = hf_hub_download(model_id, "config.json", local_files_only=True)
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001 — cosmetic enrichment only; never fatal
        return None

    model_type = data.get("model_type")
    if isinstance(model_type, str) and model_type:
        return model_type
    architectures = data.get("architectures")
    if isinstance(architectures, list) and architectures and isinstance(architectures[0], str):
        return architectures[0]
    return None
