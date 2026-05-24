"""Resolve and instantiate stock transformers model classes safely."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, cast

from torch import nn

from aakar_api.domain.exceptions import UnsupportedArchitecture

ModelFactory = Callable[[Any], nn.Module]


def resolve_model_class(config: Any, model_id: str) -> tuple[str, ModelFactory]:
    import transformers

    architecture_names = list(getattr(config, "architectures", None) or [])
    for architecture_name in architecture_names:
        model_class = getattr(transformers, architecture_name, None)
        if model_class is not None:
            return architecture_name, cast(ModelFactory, model_class)

    missing_architecture = architecture_names[0] if architecture_names else None
    raise UnsupportedArchitecture(model_id, missing_architecture)


def build_model_on_meta_device(config: Any, model_factory: ModelFactory) -> nn.Module:
    from accelerate import init_empty_weights

    with init_empty_weights():
        return model_factory(config)

