"""Convert an nn.Module tree into Aakar's recursive Node tree."""

from __future__ import annotations

from torch import nn

from aakar_api.domain.spec import Node
from aakar_api.infrastructure.introspection.naming import humanize, snake_case
from aakar_api.infrastructure.introspection.node_metadata import (
    buffer_shapes,
    category,
    extract_params,
    flops,
    intermediates,
    io_shapes,
    parameter_shape,
    source_url,
)
from aakar_api.infrastructure.introspection.role import is_decoder_layer, role
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
    node_role = role(module, ctx)
    input_shape, output_shape = io_shapes(
        module, ctx, role=node_role, decoder_layer=is_decoder_layer(module, ctx)
    )
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
        category=category(module),
        role=node_role,
        source_url=source_url(module),
        flops=flops(module, ctx, role=node_role),
        intermediates=intermediates(module, ctx, role=node_role),
    )
