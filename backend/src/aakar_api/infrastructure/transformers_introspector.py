"""Build an architecture Spec by introspecting the real `transformers` nn.Module tree.

This is Aakar's single source of architectural truth. We:

1. Fetch the config via `AutoConfig.from_pretrained` (no weights downloaded).
2. Resolve the concrete model class from `config.architectures[0]` (e.g.
   `LlamaForCausalLM`). Models requiring `trust_remote_code=True` raise
   `UnsupportedArchitecture` — we will not execute arbitrary code from random
   HF repos on the server.
3. Instantiate the class on the **meta device** via `accelerate.init_empty_weights`
   so we get the full nn.Module tree with parameter *shapes* but zero RAM.
4. Recursively walk `module.named_children()` to emit a `Node` tree carrying
   each module's class name, full attribute path, weight/bias shapes, recursive
   parameter count, symbolic input/output shapes, memory footprint, buffers,
   activation function (where applicable), and a theoretical FLOPs estimate.

All transformers work is synchronous; `introspect()` runs it in
`asyncio.to_thread` so FastAPI's event loop stays responsive.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any

from torch import nn

from aakar_api.domain.exceptions import (
    ModelGated,
    ModelNotFound,
    UnsupportedArchitecture,
)
from aakar_api.domain.spec import Node, Spec
from aakar_api.infrastructure.spec_cache import hash_config

_SNAKE_RE_1 = re.compile(r"(.)([A-Z][a-z]+)")
_SNAKE_RE_2 = re.compile(r"([a-z0-9])([A-Z])")

# Reference dimensions used to compute the `flops` field on each Node. Picked
# to be a typical context window so the numbers are comparable across model
# families; surfaced on the Spec so the UI can label the estimate.
_FLOPS_REF_BATCH = 1
_FLOPS_REF_SEQ = 2048

# Bytes per element for the dtypes we care about. Read from config.torch_dtype
# (the model's *intended* dtype) — the meta-device default is always fp32 so
# `p.element_size()` is unreliable here.
_DTYPE_BYTES = {
    "float32": 4,
    "float16": 2,
    "bfloat16": 2,
    "float64": 8,
    "int8": 1,
    "uint8": 1,
}

# Fields surfaced in `Spec.config_summary` when the config exposes them.
_CONFIG_SUMMARY_KEYS = (
    "model_type",
    "hidden_size",
    "num_hidden_layers",
    "num_attention_heads",
    "num_key_value_heads",
    "head_dim",
    "intermediate_size",
    "vocab_size",
    "max_position_embeddings",
    "tie_word_embeddings",
    "torch_dtype",
    "rope_theta",
    "hidden_act",
    "sliding_window",
    "bos_token_id",
    "eos_token_id",
    "pad_token_id",
    "num_local_experts",
    "num_experts_per_tok",
)

# Per-module attrs surfaced in `Node.params` when present and scalar/iterable.
_MODULE_PARAM_KEYS = (
    "in_features",
    "out_features",
    "num_embeddings",
    "embedding_dim",
    "normalized_shape",
    "eps",
    "num_heads",
    "head_dim",
    "hidden_size",
    "intermediate_size",
    "p",  # Dropout probability
)


def _snake_case(name: str) -> str:
    """`LlamaSdpaAttention` → `llama_sdpa_attention`."""
    s = _SNAKE_RE_1.sub(r"\1_\2", name)
    return _SNAKE_RE_2.sub(r"\1_\2", s).lower()


def _humanize(segment: str) -> str:
    """Last path segment → card label. `q_proj` → 'Q proj'; `0` → 'Layer 0'."""
    if not segment:
        return segment
    if segment.isdigit():
        return f"Layer {segment}"
    parts = segment.split("_")
    parts[0] = parts[0].capitalize()
    return " ".join(parts)


def _maybe_shape(p: Any) -> list[int] | None:
    if isinstance(p, nn.Parameter):
        return list(p.shape)
    return None


def _clean_dtype(value: Any) -> str | None:
    """`torch.float16` / `"torch.float16"` → `"float16"`."""
    if value is None:
        return None
    s = str(value)
    if s.startswith("torch."):
        s = s[len("torch.") :]
    return s


def _dtype_bytes(dtype: str | None) -> int:
    return _DTYPE_BYTES.get(dtype or "", 4)


class TransformersIntrospector:
    """Builds a `Spec` by walking the real `transformers` nn.Module tree.

    Stateless and reusable. Construct once at app startup and share across
    requests.
    """

    async def introspect(self, model_id: str) -> Spec:
        return await asyncio.to_thread(self._introspect_sync, model_id)

    async def fetch_config_hash(self, model_id: str) -> str:
        """Fetch the config and return a sha256 hex digest of its canonical JSON.

        Used by `ArchitectureService` as the spec-cache key without paying the
        cost of building the module tree. The underlying `AutoConfig.from_pretrained`
        call is cheap on a warm HF Hub cache.
        """
        return await asyncio.to_thread(self._fetch_config_hash_sync, model_id)

    def _fetch_config_hash_sync(self, model_id: str) -> str:
        config = self._load_config(model_id)
        return hash_config(config.to_dict())

    def _introspect_sync(self, model_id: str) -> Spec:
        import transformers
        from accelerate import init_empty_weights

        # Config from HF Hub
        config = self._load_config(model_id)

        arch_names = config.architectures or []
        for arch_name in arch_names:
             if hasattr(transformers, arch_name):
                 break
        cls = getattr(transformers, arch_name, None) if arch_name else None
        if cls is None:
            raise UnsupportedArchitecture(model_id, arch_name)

        with init_empty_weights():
            model = cls(config)

        param_dtype = _clean_dtype(getattr(config, "torch_dtype", None))
        hidden_size = int(getattr(config, "hidden_size", 0) or 0)
        vocab_size = int(getattr(config, "vocab_size", 0) or 0)
        num_heads = int(getattr(config, "num_attention_heads", 0) or 0)
        num_kv_heads = int(getattr(config, "num_key_value_heads", num_heads) or num_heads)
        head_dim_raw = getattr(config, "head_dim", None)
        head_dim = int(head_dim_raw) if head_dim_raw else (hidden_size // num_heads if num_heads else 0)
        # `intermediate_size` is the standard name (Llama/Mistral/Qwen/Mixtral).
        # GPT-2 uses `n_inner`, which defaults to `4 * n_embd` when unset — fall
        # through to the 4× hidden_size convention so we still surface the MLP
        # expansion for that family.
        intermediate_size = int(
            getattr(config, "intermediate_size", None)
            or getattr(config, "n_inner", None)
            or (4 * hidden_size if hidden_size else 0)
        )

        ctx = _WalkCtx(
            dtype_bytes=_dtype_bytes(param_dtype),
            hidden_size=hidden_size,
            vocab_size=vocab_size,
            num_heads=num_heads,
            num_kv_heads=num_kv_heads,
            head_dim=head_dim,
            intermediate_size=intermediate_size,
            seq_ref=_FLOPS_REF_SEQ,
            batch_ref=_FLOPS_REF_BATCH,
        )
        root = self._walk(model, path="", label_segment=cls.__name__, ctx=ctx)
        summary = self._config_summary(config, root.param_count or 0)

        return Spec(
            model_id=model_id,
            model_type=getattr(config, "model_type", "unknown"),
            config_summary=summary,
            graph=[root],
            param_dtype=param_dtype,
            attn_impl=self._attn_impl(model, config),
            position_encoding=self._position_encoding(model, config),
            tied_word_embeddings=self._tied_word_embeddings(model, config),
            flops_reference={"batch_size": ctx.batch_ref, "seq_len": ctx.seq_ref},
        )

    @staticmethod
    def _load_config(model_id: str) -> Any:
        # Imports inside the method so test stubs of `TransformersIntrospector`
        # don't pay the import cost.
        from huggingface_hub.errors import (
            EntryNotFoundError,
            GatedRepoError,
            RepositoryNotFoundError,
        )
        from transformers import AutoConfig

        try:
            return AutoConfig.from_pretrained(model_id, trust_remote_code=False)
        except GatedRepoError as exc:
            raise ModelGated(model_id) from exc
        except (RepositoryNotFoundError, EntryNotFoundError) as exc:
            raise ModelNotFound(model_id) from exc
        except ValueError as exc:
            # transformers raises ValueError for two distinct "we can't load this" cases:
            #   (a) the repo needs `trust_remote_code=True` — refused on principle.
            #   (b) the `model_type` in config.json is unknown to this version of
            #       transformers (i.e. the model is newer than our pinned dep).
            # Both surface to the user as "unsupported architecture" with a clear hint.
            text = str(exc).lower()
            if "custom code" in text or "trust_remote_code" in text:
                raise UnsupportedArchitecture(model_id, None) from exc
            if "does not recognize this architecture" in text or "not recognize" in text:
                # Extract "model type `xxx`" from the message for the error payload.
                import re as _re
                m = _re.search(r"model type [`'\"]([^`'\"]+)[`'\"]", str(exc))
                arch = m.group(1) if m else None
                raise UnsupportedArchitecture(model_id, arch) from exc
            raise
        except OSError as exc:
            raise ModelNotFound(model_id) from exc

    def _walk(
        self, module: nn.Module, *, path: str, label_segment: str, ctx: _WalkCtx
    ) -> Node:
        children: list[Node] = [
            self._walk(child, path=f"{path}.{name}" if path else name, label_segment=name, ctx=ctx)
            for name, child in module.named_children()
        ]

        cls_name = type(module).__name__
        param_count = sum(p.numel() for p in module.parameters(recurse=True))
        in_shape, out_shape = self._io_shapes(module, ctx)
        buffers = self._buffer_shapes(module)

        return Node(
            id=path or cls_name,
            type=_snake_case(cls_name),
            label=_humanize(label_segment) if path else cls_name,
            meta=cls_name if path else None,
            module_class=cls_name,
            module_path=path or None,
            weight_shape=_maybe_shape(getattr(module, "weight", None)),
            bias_shape=_maybe_shape(getattr(module, "bias", None)),
            param_count=param_count,
            has_internals=bool(children),
            children=children or None,
            params=self._extract_params(module),
            input_shape=in_shape,
            output_shape=out_shape,
            memory_bytes=param_count * ctx.dtype_bytes if param_count else None,
            buffers=buffers or None,
            activation=self._activation(module),
            flops=self._flops(module, ctx),
            intermediates=self._intermediates(module, ctx),
        )

    @staticmethod
    def _extract_params(module: nn.Module) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for key in _MODULE_PARAM_KEYS:
            v = getattr(module, key, None)
            if v is None or callable(v):
                continue
            if isinstance(v, int | float | bool | str):
                out[key] = v
            elif hasattr(v, "__iter__") and not isinstance(v, str | bytes):
                try:
                    coerced = [int(x) for x in v]
                    out[key] = coerced
                except (TypeError, ValueError):
                    continue
        if isinstance(module, nn.Linear):
            out["has_bias"] = module.bias is not None
        return out

    @staticmethod
    def _io_shapes(module: nn.Module, ctx: _WalkCtx) -> tuple[str | None, str | None]:
        """Symbolic input/output shapes derived from the module + model config.

        Returns `(None, None)` for container modules (ModuleList, root) where
        I/O is meaningless or ambiguous.
        """
        if isinstance(module, nn.Linear):
            return f"[B, S, {module.in_features}]", f"[B, S, {module.out_features}]"
        if isinstance(module, nn.Embedding):
            return "[B, S]", f"[B, S, {module.embedding_dim}]"
        cls = type(module).__name__
        # nn.LayerNorm + transformers' own *RMSNorm / *LayerNorm classes.
        if isinstance(module, nn.LayerNorm) or "RMSNorm" in cls or "LayerNorm" in cls:
            shape = f"[B, S, {ctx.hidden_size}]"
            return shape, shape
        if isinstance(module, nn.Dropout):
            shape = f"[B, S, {ctx.hidden_size}]"
            return shape, shape
        # Attention / MLP / decoder layer / backbone — all hidden → hidden.
        if any(s in cls for s in ("Attention", "MLP", "FeedForward", "FFN", "DecoderLayer", "EncoderLayer")):
            shape = f"[B, S, {ctx.hidden_size}]"
            return shape, shape
        # Top-level CausalLM heads: tokens in, logits out.
        # Covers `*ForCausalLM` (Llama, Mistral, …) and `*LMHeadModel` (GPT-2).
        # Checked before the generic backbone branch because `GPT2LMHeadModel`
        # also ends with "Model".
        if cls.endswith("ForCausalLM") or cls.endswith("LMHeadModel"):
            return "[B, S]", f"[B, S, {ctx.vocab_size}]"
        # Backbone (e.g. LlamaModel, GPT2Model): tokens in, hidden out.
        if cls.endswith("Model") and not cls.endswith("ForSequenceClassification"):
            return "[B, S]", f"[B, S, {ctx.hidden_size}]"
        # Rotary embedding modules: position → rotary frequencies — skip.
        return None, None

    @staticmethod
    def _buffer_shapes(module: nn.Module) -> dict[str, list[int]]:
        """Map this module's *own* buffers (non-recursive) to their shapes."""
        out: dict[str, list[int]] = {}
        for name, buf in module.named_buffers(recurse=False):
            if buf is None:
                continue
            out[name] = list(buf.shape)
        return out

    @staticmethod
    def _activation(module: nn.Module) -> str | None:
        # MLP modules in transformers typically expose `act_fn` as a callable
        # nn.Module (SiLU, GELUActivation, etc.). Some older configs use
        # `activation_fn` or a plain string.
        for attr in ("act_fn", "activation_fn", "activation"):
            act = getattr(module, attr, None)
            if act is None:
                continue
            if isinstance(act, str):
                return act
            if isinstance(act, nn.Module):
                return type(act).__name__
            if callable(act):
                return type(act).__name__
        return None

    @staticmethod
    def _flops(module: nn.Module, ctx: _WalkCtx) -> int | None:
        """Theoretical forward-pass FLOPs at the reference (B, S).

        Only populated for modules with an S-independent or cleanly-S-scaled
        formula. Container modules return None — their children sum gives a
        lower bound; the difference (attention softmax, residual adds) is
        usually negligible compared to projections.
        """
        s = ctx.seq_ref * ctx.batch_ref
        if isinstance(module, nn.Linear):
            # 2 * in * out MACs per output token.
            return 2 * s * module.in_features * module.out_features
        if isinstance(module, nn.Embedding):
            # Pure lookup — counts as zero multiply-adds.
            return 0
        cls = type(module).__name__
        if isinstance(module, nn.LayerNorm) or "RMSNorm" in cls or "LayerNorm" in cls:
            # ~5 ops per element (mean, var, normalize, scale, shift).
            return 5 * s * ctx.hidden_size
        return None

    @staticmethod
    def _intermediates(module: nn.Module, ctx: _WalkCtx) -> dict[str, str] | None:
        """Per-class intermediate tensor shapes that aren't visible from in/out.

        For `*Attention`: the multi-head reshape of Q/K/V (with GQA grouping on
        K and V if applicable) and the `[B, num_heads, S, S]` attention map —
        the S² term that makes attention quadratic.

        For `*MLP` / `*FeedForward` / `*FFN`: the hidden expansion to
        `intermediate_size` after the up (or gate) projection — exposes the
        expansion ratio (4× for vanilla MLP, ~2.67× for SwiGLU).

        Values are read from module attrs first (so quirks like a layer that
        overrides `num_heads` are honored), falling back to the config-derived
        ctx defaults. Skipped if the dims aren't available.
        """
        cls = type(module).__name__
        if "Attention" in cls:
            n_heads = (
                getattr(module, "num_heads", None)
                or getattr(module, "num_attention_heads", None)
                or ctx.num_heads
            )
            n_kv = (
                getattr(module, "num_key_value_heads", None)
                or getattr(module, "num_kv_heads", None)
                or n_heads
                or ctx.num_kv_heads
            )
            head_dim = getattr(module, "head_dim", None) or ctx.head_dim
            if not n_heads or not head_dim:
                return None
            return {
                "q": f"[B, {n_heads}, S, {head_dim}]",
                "k": f"[B, {n_kv}, S, {head_dim}]",
                "v": f"[B, {n_kv}, S, {head_dim}]",
                "attn_scores": f"[B, {n_heads}, S, S]",
            }
        if any(s in cls for s in ("MLP", "FeedForward", "FFN")):
            intermediate = (
                getattr(module, "intermediate_size", None)
                or getattr(module, "ffn_dim", None)
                or ctx.intermediate_size
            )
            if not intermediate:
                return None
            return {"up": f"[B, S, {intermediate}]"}
        return None

    @staticmethod
    def _attn_impl(model: nn.Module, config: Any) -> str | None:
        impl = getattr(config, "_attn_implementation", None)
        if isinstance(impl, str) and impl:
            return impl
        # Fallback: read from the first self-attn submodule class name.
        for m in model.modules():
            cls = type(m).__name__
            if cls.endswith("FlashAttention2"):
                return "flash_attention_2"
            if "Sdpa" in cls and "Attention" in cls:
                return "sdpa"
            if cls.endswith("Attention") and "Sdpa" not in cls and "Flash" not in cls:
                # First plain *Attention found — likely eager. Don't return
                # immediately though; sdpa/flash variants may appear deeper.
                pass
        return "eager"

    @staticmethod
    def _position_encoding(model: nn.Module, config: Any) -> str | None:
        if getattr(config, "rope_theta", None) is not None:
            return "rope"
        if getattr(config, "rope_scaling", None) is not None:
            return "rope"
        for m in model.modules():
            cls = type(m).__name__
            if "Rotary" in cls:
                return "rope"
            if "ALiBi" in cls or "Alibi" in cls:
                return "alibi"
        # GPT-2 style: a learned position-embedding table `wpe` on the backbone.
        for name, _ in model.named_modules():
            if name.endswith(".wpe") or name == "wpe":
                return "learned"
        return None

    @staticmethod
    def _tied_word_embeddings(model: nn.Module, config: Any) -> bool | None:
        # On meta-instantiation we never call `model.tie_weights()`, so
        # `inp.weight is out.weight` is always False even for models like GPT-2
        # whose config sets `tie_word_embeddings=True`. The config flag is the
        # ground truth for intent — fall back to it when the runtime check
        # disagrees.
        cfg_tied = getattr(config, "tie_word_embeddings", None)
        try:
            inp = model.get_input_embeddings()
            out = model.get_output_embeddings()
        except (AttributeError, NotImplementedError):
            return cfg_tied if isinstance(cfg_tied, bool) else None
        if inp is None or out is None:
            return cfg_tied if isinstance(cfg_tied, bool) else None
        if inp.weight is out.weight:
            return True
        return cfg_tied if isinstance(cfg_tied, bool) else False

    @staticmethod
    def _config_summary(config: Any, total_params: int) -> dict[str, Any]:
        out: dict[str, Any] = {"total_params": total_params}
        for key in _CONFIG_SUMMARY_KEYS:
            v = getattr(config, key, None)
            if v is None:
                continue
            # torch_dtype can be torch.dtype — coerce to str for JSON.
            if not isinstance(v, int | float | bool | str):
                v = str(v)
            out[key] = v
        # Derived: GQA ratio (num_heads per kv head). 1 means MHA, >1 means GQA.
        n_heads = getattr(config, "num_attention_heads", None)
        n_kv = getattr(config, "num_key_value_heads", None)
        if isinstance(n_heads, int) and isinstance(n_kv, int) and n_kv > 0:
            out["gqa_ratio"] = n_heads // n_kv
        # Quantization config — flatten to a JSON-friendly dict if present.
        qcfg = getattr(config, "quantization_config", None)
        if qcfg is not None:
            if hasattr(qcfg, "to_dict"):
                try:
                    out["quantization_config"] = qcfg.to_dict()
                except Exception:
                    out["quantization_config"] = str(qcfg)
            elif isinstance(qcfg, dict):
                out["quantization_config"] = qcfg
            else:
                out["quantization_config"] = str(qcfg)
        return out


class _WalkCtx:
    """Shared, read-only walk context. Plain object instead of a dataclass to
    avoid adding a runtime dep just for hashability."""

    __slots__ = (
        "dtype_bytes",
        "hidden_size",
        "vocab_size",
        "num_heads",
        "num_kv_heads",
        "head_dim",
        "intermediate_size",
        "seq_ref",
        "batch_ref",
    )

    def __init__(
        self,
        *,
        dtype_bytes: int,
        hidden_size: int,
        vocab_size: int,
        num_heads: int,
        num_kv_heads: int,
        head_dim: int,
        intermediate_size: int,
        seq_ref: int,
        batch_ref: int,
    ) -> None:
        self.dtype_bytes = dtype_bytes
        self.hidden_size = hidden_size
        self.vocab_size = vocab_size
        self.num_heads = num_heads
        self.num_kv_heads = num_kv_heads
        self.head_dim = head_dim
        self.intermediate_size = intermediate_size
        self.seq_ref = seq_ref
        self.batch_ref = batch_ref
