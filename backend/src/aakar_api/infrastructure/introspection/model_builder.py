"""Resolve and instantiate stock transformers model classes safely."""

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Any, cast

from aakar_api.domain.exceptions import UnsupportedArchitecture

if TYPE_CHECKING:
    from torch import nn

ModelFactory = Callable[[Any], "nn.Module"]


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
    import torch
    from accelerate import init_empty_weights

    # `init_empty_weights()` only relocates a parameter to the meta device *after*
    # it has been constructed (it patches `register_parameter`); it does not redirect
    # the tensor factory calls themselves. That hole is invisible for conventional
    # layers — each weight's transient `torch.empty(...)` is small — but transformers'
    # fused-MoE path stacks every expert of a layer into one parameter via a bare
    # `torch.empty(num_experts, 2 * intermediate_dim, hidden_dim)` with no `device=`.
    # For a 256-expert layer that single tensor is ~16 GiB, fully materialized on CPU
    # before the meta move can happen — instant OOM. Defaulting the device to meta makes
    # those factory calls allocate nothing, so any-size model builds for structure alone.
    with torch.device("meta"), init_empty_weights():
        return model_factory(config)

