"""Fluent Builder for `Node` instances.

Adapters compose `Node` trees that have many optional fields (meta, params,
children, shapes, param_count). A 10-arg constructor would be hostile to read;
this Builder makes composition declarative.

Example:
    node = (BlockBuilder("embed", "token_embedding")
            .label("Input embedding")
            .meta("tokens -> vectors")
            .params(vocab_size=128256, hidden_size=4096)
            .param_count(525_336_576)
            .shapes(output="[B, T, 4096]")
            .build())
"""

from __future__ import annotations

from typing import Any

from aakar_api.domain.spec import Node


class BlockBuilder:
    """Constructs one `Node`. Each setter mutates internal state and returns self."""

    def __init__(self, block_id: str, block_type: str) -> None:
        self._kwargs: dict[str, Any] = {
            "id": block_id,
            "type": block_type,
            "label": "",
        }

    def label(self, value: str) -> BlockBuilder:
        self._kwargs["label"] = value
        return self

    def meta(self, value: str) -> BlockBuilder:
        self._kwargs["meta"] = value
        return self

    def params(self, **kv: Any) -> BlockBuilder:
        self._kwargs["params"] = dict(kv)
        return self

    def children(self, nodes: list[Node]) -> BlockBuilder:
        # Setting children implicitly marks the node as having internals — that
        # is what `has_internals` means semantically, so we shouldn't make the
        # caller set both.
        self._kwargs["children"] = list(nodes)
        self._kwargs["has_internals"] = True
        return self

    def param_count(self, n: int) -> BlockBuilder:
        self._kwargs["param_count"] = int(n)
        return self

    def shapes(self, *, input: str | None = None, output: str | None = None) -> BlockBuilder:
        if input is not None:
            self._kwargs["input_shape"] = input
        if output is not None:
            self._kwargs["output_shape"] = output
        return self

    def build(self) -> Node:
        return Node(**self._kwargs)
