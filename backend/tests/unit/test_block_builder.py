"""Tests for the fluent BlockBuilder."""

from __future__ import annotations

import pytest

from aakar_api.adapters.building.block_builder import BlockBuilder
from aakar_api.domain.spec import Node


def test_minimal_build() -> None:
    node = BlockBuilder("x", "linear").label("X").build()
    assert isinstance(node, Node)
    assert node.id == "x"
    assert node.type == "linear"
    assert node.label == "X"
    assert node.params == {}
    assert node.has_internals is False
    assert node.children is None


def test_full_chain() -> None:
    node = (
        BlockBuilder("attn", "self_attention")
        .label("Self-attention")
        .meta("GQA")
        .params(num_heads=32, head_dim=128)
        .param_count(41_943_040)
        .shapes(input="[B, T, 4096]", output="[B, T, 4096]")
        .build()
    )
    assert node.label == "Self-attention"
    assert node.meta == "GQA"
    assert node.params == {"num_heads": 32, "head_dim": 128}
    assert node.param_count == 41_943_040
    assert node.input_shape == "[B, T, 4096]"
    assert node.output_shape == "[B, T, 4096]"


def test_children_sets_has_internals() -> None:
    child = BlockBuilder("c", "linear").label("C").build()
    parent = BlockBuilder("p", "decoder_block").label("P").children([child]).build()
    assert parent.has_internals is True
    assert parent.children is not None
    assert len(parent.children) == 1
    assert parent.children[0].id == "c"


def test_shapes_partial() -> None:
    only_output = BlockBuilder("o", "x").label("o").shapes(output="[B, T, 4096]").build()
    assert only_output.input_shape is None
    assert only_output.output_shape == "[B, T, 4096]"


def test_node_is_frozen() -> None:
    node = BlockBuilder("x", "linear").label("X").build()
    # Pydantic frozen=True raises ValidationError on attribute assignment.
    with pytest.raises(Exception):
        node.label = "mutated"  # type: ignore[misc]
