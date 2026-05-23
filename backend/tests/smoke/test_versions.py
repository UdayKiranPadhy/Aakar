"""Verify the installed deps surface the APIs the introspector depends on.

If a future dep bump renames or relocates one of these, the test fails fast
at smoke time with a clear pointer to what moved — instead of surfacing as
an opaque 500 at runtime.
"""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.smoke


def test_transformers_top_level_model_classes() -> None:
    """The introspector resolves `config.architectures[0]` via getattr on the
    `transformers` module. Common families must stay top-level attributes."""
    import transformers

    required = ("LlamaForCausalLM", "GPT2LMHeadModel", "AutoConfig")
    missing = [name for name in required if getattr(transformers, name, None) is None]
    assert not missing, f"transformers no longer exports: {missing}"


def test_accelerate_init_empty_weights() -> None:
    """`init_empty_weights` is the meta-device context manager we depend on."""
    from accelerate import init_empty_weights
    assert callable(init_empty_weights)


def test_huggingface_hub_canonical_error_imports() -> None:
    """Our error mapping imports these by name from `huggingface_hub.errors`."""
    from huggingface_hub.errors import (
        EntryNotFoundError,
        GatedRepoError,
        RepositoryNotFoundError,
    )
    for cls in (EntryNotFoundError, GatedRepoError, RepositoryNotFoundError):
        assert issubclass(cls, Exception)


def test_torch_meta_device() -> None:
    """The meta device must be available; it's what makes empty-weights work."""
    import torch

    t = torch.empty(2, 2, device="meta")
    assert str(t.device) == "meta"
    assert list(t.shape) == [2, 2]
