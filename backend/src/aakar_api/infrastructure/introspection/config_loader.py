"""Load HuggingFace configs and translate third-party errors to domain errors."""

from __future__ import annotations

import re
from typing import Any

from aakar_api.domain.exceptions import ModelGated, ModelNotFound, UnsupportedArchitecture
from aakar_api.infrastructure.spec_cache import hash_config

_MODEL_TYPE_RE = re.compile(r"model type [`'\"]([^`'\"]+)[`'\"]")


def load_config(model_id: str) -> Any:
    from huggingface_hub.errors import (
        EntryNotFoundError,
        GatedRepoError,
        RepositoryNotFoundError,
    )
    from transformers import AutoConfig

    try:
        # NEVER True here: this runs in the API process. Models that need custom
        # code are refused at this step and (when opted in) handled out-of-process
        # by SandboxedIntrospector — see infrastructure/sandbox/.
        return AutoConfig.from_pretrained(model_id, trust_remote_code=False)
    except GatedRepoError as exc:
        raise ModelGated(model_id) from exc
    except (RepositoryNotFoundError, EntryNotFoundError) as exc:
        raise ModelNotFound(model_id) from exc
    except ValueError as exc:
        raise _map_config_value_error(model_id, exc) from exc
    except OSError as exc:
        raise ModelNotFound(model_id) from exc


def config_hash(config: Any) -> str:
    return hash_config(config.to_dict())


def _map_config_value_error(model_id: str, exc: ValueError) -> UnsupportedArchitecture:
    message = str(exc)
    lowered = message.lower()
    if "custom code" in lowered or "trust_remote_code" in lowered:
        return UnsupportedArchitecture(model_id, None)
    if "does not recognize this architecture" in lowered or "not recognize" in lowered:
        match = _MODEL_TYPE_RE.search(message)
        architecture = match.group(1) if match else None
        return UnsupportedArchitecture(model_id, architecture)
    raise exc

