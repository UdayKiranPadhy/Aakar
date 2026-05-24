"""Convert an nn.Module tree into Aakar's recursive Node tree."""

from __future__ import annotations

from torch import nn

from aakar_api.domain.spec import Node
from aakar_api.infrastructure.introspection.naming import humanize, snake_case
from aakar_api.infrastructure.introspection.node_metadata import (
    activation_name,
    buffer_shapes,
    extract_params,
    flops,
    intermediates,
    io_shapes,
    parameter_shape,
)
from aakar_api.infrastructure.introspection.walk_context import WalkContext


def walk_module_tree(
    module: nn.Module,
    *,
    path: str,
    label_segment: str,
    ctx: WalkContext,
) -> Node:
    children = [
        walk_module_tree(
            child,
            path=f"{path}.{name}" if path else name,
            label_segment=name,
            ctx=ctx,
        )
        for name, child in module.named_children()
    ]

    class_name = type(module).__name__
    param_count = sum(param.numel() for param in module.parameters(recurse=True))
    input_shape, output_shape = io_shapes(module, ctx)
    buffers = buffer_shapes(module)

    return Node(
        id=path or class_name,
        type=snake_case(class_name),
        label=humanize(label_segment) if path else class_name,
        meta=class_name if path else None,
        module_class=class_name,
        module_path=path or None,
        weight_shape=parameter_shape(getattr(module, "weight", None)),
        bias_shape=parameter_shape(getattr(module, "bias", None)),
        param_count=param_count,
        has_internals=bool(children),
        children=children or None,
        params=extract_params(module),
        input_shape=input_shape,
        output_shape=output_shape,
        memory_bytes=param_count * ctx.dtype_bytes if param_count else None,
        buffers=buffers or None,
        activation=activation_name(module),
        flops=flops(module, ctx),
        intermediates=intermediates(module, ctx),
    )
