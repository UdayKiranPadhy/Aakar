"""Unit tests for the pure helpers in `node_metadata`.

These don't need a real model — they exercise the category-detection logic
and the structural attention/MLP fingerprints against toy `nn.Module`s.
"""

from __future__ import annotations

from torch import nn

from aakar_api.infrastructure.introspection.node_metadata import (
    _looks_like_attention,
    _looks_like_mlp,
    category,
    intermediates,
    source_url,
)
from aakar_api.infrastructure.introspection.walk_context import WalkContext


def test_category_activation() -> None:
    assert category(nn.SiLU()) == "activation"
    assert category(nn.GELU()) == "activation"
    assert category(nn.ReLU()) == "activation"
    assert category(nn.Tanh()) == "activation"


def test_category_norm() -> None:
    assert category(nn.LayerNorm(8)) == "norm"
    assert category(nn.GroupNorm(2, 8)) == "norm"
    assert category(nn.BatchNorm1d(8)) == "norm"


def test_category_dropout() -> None:
    assert category(nn.Dropout(0.1)) == "dropout"
    assert category(nn.AlphaDropout(0.1)) == "dropout"


def test_category_linear() -> None:
    assert category(nn.Linear(4, 4)) == "linear"
    assert category(nn.Identity()) == "linear"


def test_category_embedding() -> None:
    assert category(nn.Embedding(8, 4)) == "embedding"


def test_category_container() -> None:
    assert category(nn.ModuleList()) == "container"
    assert category(nn.Sequential()) == "container"
    assert category(nn.ModuleDict()) == "container"


def test_category_multihead_attention_excluded() -> None:
    # MultiheadAttention lives in torch.nn.modules.activation but isn't an
    # activation — explicit carve-out.
    assert category(nn.MultiheadAttention(8, 2)) is None


def test_category_unknown_module() -> None:
    class Custom(nn.Module):
        pass

    assert category(Custom()) is None


# ─── Structural attention / MLP detection ───────────────────────────────────
# Detection is fingerprint-based, not class-name-based. Toy modules below use
# deliberately weird class names ("Foo", "AbcXyz", "TotallyUnrelated") to make
# sure no substring like "Attention" / "MLP" / "FFN" leaks in.


def _ctx() -> WalkContext:
    # Minimal context — only the fields the helpers may read are set.
    return WalkContext(
        hidden_size=8,
        vocab_size=16,
        num_heads=4,
        num_kv_heads=2,
        head_dim=2,
        intermediate_size=32,
        seq_ref=16,
        batch_ref=1,
        dtype_bytes=4,
    )


def test_looks_like_attention_by_num_heads_attr() -> None:
    class Foo(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.num_heads = 4
            self.head_dim = 2

    assert _looks_like_attention(Foo()) is True


def test_looks_like_attention_by_num_attention_heads_attr() -> None:
    class Foo(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.num_attention_heads = 8

    assert _looks_like_attention(Foo()) is True


def test_looks_like_attention_by_qkv_children() -> None:
    class Foo(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.q_proj = nn.Linear(8, 8)
            self.k_proj = nn.Linear(8, 8)
            self.v_proj = nn.Linear(8, 8)

    assert _looks_like_attention(Foo()) is True


def test_looks_like_attention_by_gpt2_c_attn_child() -> None:
    class Foo(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.c_attn = nn.Linear(8, 24)
            self.c_proj = nn.Linear(8, 8)

    assert _looks_like_attention(Foo()) is True


def test_looks_like_mlp_by_intermediate_size_attr() -> None:
    class Foo(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.intermediate_size = 32

    assert _looks_like_mlp(Foo()) is True


def test_looks_like_mlp_by_gated_children() -> None:
    class Foo(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.gate_proj = nn.Linear(8, 32)
            self.up_proj = nn.Linear(8, 32)
            self.down_proj = nn.Linear(32, 8)

    assert _looks_like_mlp(Foo()) is True


def test_looks_like_mlp_by_gpt2_c_fc_child() -> None:
    # GPT-2 MLP has c_fc + c_proj. c_fc alone is enough — c_proj is omitted
    # from the MLP fingerprint because attention also has c_proj.
    class Foo(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.c_fc = nn.Linear(8, 32)
            self.c_proj = nn.Linear(32, 8)

    assert _looks_like_mlp(Foo()) is True


def test_looks_like_attention_false_on_unrelated_module() -> None:
    class TotallyUnrelated(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.proj = nn.Linear(8, 8)

    assert _looks_like_attention(TotallyUnrelated()) is False
    assert _looks_like_mlp(TotallyUnrelated()) is False


def test_looks_like_attention_false_on_decoder_layer_wrapper() -> None:
    # A DecoderLayer holds attention and MLP as *children*, but q_proj and
    # gate_proj are nested two levels deep — so the wrapper itself should not
    # be classified as attention or MLP.
    class Inner(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.q_proj = nn.Linear(8, 8)
            self.k_proj = nn.Linear(8, 8)
            self.v_proj = nn.Linear(8, 8)

    class Outer(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.self_attn = Inner()
            self.norm = nn.LayerNorm(8)

    assert _looks_like_attention(Outer()) is False
    assert _looks_like_mlp(Outer()) is False


def test_looks_like_detection_independent_of_class_name() -> None:
    # Even a class with no transformer-y substrings ("AbcXyz") should be
    # classified correctly when it has the right structure. This is the
    # property the previous class-name implementation lacked.
    class AbcXyz(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.num_heads = 4
            self.head_dim = 2

    assert _looks_like_attention(AbcXyz()) is True


def test_intermediates_attention_returns_q_k_v_scores() -> None:
    class Foo(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.num_heads = 4
            self.num_key_value_heads = 2  # GQA: 2 KV heads
            self.head_dim = 8

    out = intermediates(Foo(), _ctx())
    assert out == {
        "q": "[B, 4, S, 8]",
        "k": "[B, 2, S, 8]",  # GQA grouping reflected
        "v": "[B, 2, S, 8]",
        "attn_scores": "[B, 4, S, S]",
    }


def test_intermediates_mlp_returns_up_shape() -> None:
    class Foo(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.intermediate_size = 256

    out = intermediates(Foo(), _ctx())
    assert out == {"up": "[B, S, 256]"}


def test_intermediates_none_on_unrelated_module() -> None:
    assert intermediates(nn.Linear(8, 8), _ctx()) is None
    assert intermediates(nn.Embedding(16, 8), _ctx()) is None
    assert intermediates(nn.LayerNorm(8), _ctx()) is None


# ─── source_url ─────────────────────────────────────────────────────────────


def test_source_url_for_torch_module() -> None:
    url = source_url(nn.Linear(8, 8))
    assert url is not None
    assert url.startswith("https://github.com/pytorch/pytorch/blob/")
    assert "torch/nn/modules/linear.py" in url
    assert "#L" in url  # line anchor present


def test_source_url_for_transformers_module() -> None:
    # Use any transformers class — the activation wrappers always exist.
    from transformers.activations import GELUActivation

    url = source_url(GELUActivation())
    assert url is not None
    assert url.startswith("https://github.com/huggingface/transformers/blob/")
    assert "src/transformers/activations.py" in url
    assert "#L" in url


def test_source_url_none_for_custom_module() -> None:
    class Custom(nn.Module):
        pass

    # Defined in this test module, not in torch.* or transformers.*.
    assert source_url(Custom()) is None
