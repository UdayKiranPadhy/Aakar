"""Capture the operations inside each module's `forward()` — no weights, no compute.

## Why this shape

The obvious tool, `torch.fx.symbolic_trace` (and transformers' old `HFTracer`),
does not work here: stock FX chokes on the data-dependent control flow in modern
`transformers` forwards, and `transformers.utils.fx` was removed in transformers v5.

What *does* work is running a single forward pass under a **`FakeTensorMode`**.
Two facts make this exact and cheap:

  * transformers' `is_tracing()` returns True when the tensors flowing through are
    fake (`is_fake_tensor`), so the library takes its trace-friendly branches and
    skips the value-dependent ones that a `meta` tensor can't execute.
  * fake tensors carry shapes but allocate no storage and run no kernels — so the
    pass needs no weights (the model stays on `meta`), downloads nothing, and is
    essentially free.

We observe every ATen op the forward dispatches with a `TorchDispatchMode`, and
attribute each op to the innermost executing module via `forward` hooks. The result
is faithful and family-agnostic: a `Linear` reports its `mm`, an RMSNorm its
`pow/mean/rsqrt/mul`, a decoder layer its two residual `add`s, attention its
Q·Kᵀ / softmax / ·V math.

Best-effort by construction: anything unexpected (an exotic forward, a private torch
API moving) is swallowed and the model simply renders without operations — the
module tree is never affected.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from aakar_api.domain.spec import Operation
from aakar_api.infrastructure.introspection.walk_context import WalkContext

if TYPE_CHECKING:
    from torch import nn

# Distinctive trace dimensions, symbolized back to "B"/"S" in `out_shape`. The
# sequence length is an odd prime so it can't collide with the power-of-two-ish
# dims real models use (hidden, heads, head_dim, intermediate, vocab).
_BATCH_DUMMY = 1
_SEQ_DUMMY = 251

# ATen op name -> coarse category (color/grouping bucket in the UI).
_CATEGORY: dict[str, str] = {
    # matmul family
    "mm": "matmul", "bmm": "matmul", "addmm": "matmul", "baddbmm": "matmul",
    "matmul": "matmul", "linear": "matmul", "dot": "matmul", "mv": "matmul",
    "einsum": "matmul",
    # activations
    "_safe_softmax": "activation", "_softmax": "activation", "softmax": "activation",
    "silu": "activation", "gelu": "activation", "relu": "activation",
    "sigmoid": "activation", "tanh": "activation", "elu": "activation",
    "scaled_dot_product_attention": "attention",
    # normalization math
    "rsqrt": "norm", "mean": "norm", "pow": "norm", "var": "norm", "std": "norm",
    "sqrt": "norm", "native_layer_norm": "norm", "layer_norm": "norm",
    "native_group_norm": "norm",
    # elementwise
    "add": "elementwise", "sub": "elementwise", "mul": "elementwise",
    "div": "elementwise", "neg": "elementwise", "where": "elementwise",
    "cos": "elementwise", "sin": "elementwise", "rsub": "elementwise",
    "exp": "elementwise", "reciprocal": "elementwise", "abs": "elementwise",
    "clamp": "elementwise", "tril": "elementwise", "triu": "elementwise",
    # embeddings
    "embedding": "embedding", "one_hot": "embedding",
    # pure shape shuffles
    "view": "shape", "reshape": "shape", "transpose": "shape", "permute": "shape",
    "expand": "shape", "cat": "shape", "slice": "shape", "unsqueeze": "shape",
    "squeeze": "shape", "repeat": "shape", "repeat_interleave": "shape",
    "t": "shape", "contiguous": "shape", "flatten": "shape", "split": "shape",
    "stack": "shape", "chunk": "shape", "narrow": "shape", "select": "shape",
    "roll": "shape", "flip": "shape",
}

# Friendlier display names; anything missing falls back to the raw ATen name.
_LABEL: dict[str, str] = {
    "mm": "matrix multiply", "bmm": "batched matmul", "addmm": "linear (matmul + bias)",
    "baddbmm": "batched matmul + bias", "matmul": "matrix multiply", "linear": "linear",
    "_safe_softmax": "softmax", "_softmax": "softmax", "softmax": "softmax",
    "scaled_dot_product_attention": "scaled dot-product attention",
    "silu": "SiLU", "gelu": "GELU", "relu": "ReLU", "sigmoid": "sigmoid", "tanh": "tanh",
    "rsqrt": "reciprocal sqrt", "mean": "mean", "pow": "power", "var": "variance",
    "native_layer_norm": "layer norm", "layer_norm": "layer norm",
    "add": "add", "sub": "subtract", "mul": "multiply", "div": "divide", "neg": "negate",
    "where": "select (mask)", "cos": "cosine", "sin": "sine", "rsub": "reverse subtract",
    "exp": "exp", "reciprocal": "reciprocal",
    "embedding": "embedding lookup",
    "view": "reshape", "reshape": "reshape", "transpose": "transpose", "permute": "permute",
    "expand": "expand", "cat": "concatenate", "slice": "slice", "unsqueeze": "unsqueeze",
    "squeeze": "squeeze", "repeat": "repeat", "t": "transpose", "contiguous": "contiguous",
    "flatten": "flatten", "stack": "stack",
}

# Pure bookkeeping / mask-construction ops that add noise without teaching anything.
_SKIP: frozenset[str] = frozenset({
    "detach", "_to_copy", "lift_fresh", "alias", "_unsafe_view", "_assert_tensor_metadata",
    "_local_scalar_dense", "clone", "empty_like", "ones_like", "zeros_like", "new_ones",
    "new_zeros", "new_empty", "scalar_tensor", "_has_compatible_shallow_copy_type", "device",
    "item", "arange", "cumsum", "eq", "le", "ne", "lt", "gt", "ge", "bitwise_and",
    "bitwise_or", "logical_not", "logical_and", "masked_fill", "full", "full_like", "fill",
    "copy_", "_unsafe_index", "index", "to", "isin", "any", "all", "nonzero",
})


def trace_operations(
    model: nn.Module, config: Any, ctx: WalkContext
) -> dict[str, list[Operation]]:
    """Map module path -> ops in its forward. Returns `{}` if the model won't trace.

    `config` is currently unused but kept in the signature so per-config tracing
    inputs (e.g. multimodal models needing `pixel_values`) can be added without a
    call-site change.
    """
    try:
        return _OperationTracer(model, ctx).run()
    except Exception:  # noqa: BLE001 — best-effort; a failed trace just means no ops
        return {}


class _OperationTracer:
    """Runs one fake forward and records per-module ATen ops."""

    def __init__(self, model: nn.Module, ctx: WalkContext) -> None:
        self._model = model
        self._ctx = ctx
        self._stack: list[str] = []  # qualified module paths currently in forward()
        self._ops_by_path: dict[str, list[Operation]] = {}
        self._producer: dict[int, str] = {}  # id(tensor) -> op id that produced it
        self._counts: dict[str, int] = {}  # ATen op name -> running count (for unique ids)

    def run(self) -> dict[str, list[Operation]]:
        # Imported lazily: these are torch internals (stable in 2.x but private), so an
        # import error degrades to "no operations" instead of breaking introspection.
        import torch
        from torch._subclasses.fake_tensor import FakeTensorMode
        from torch.utils._python_dispatch import TorchDispatchMode

        tracer = self

        class _Dispatch(TorchDispatchMode):
            def __torch_dispatch__(self, func, types, args=(), kwargs=None):  # noqa: ANN001
                kwargs = kwargs or {}
                out = func(*args, **kwargs)
                tracer._record(func, args, kwargs, out)
                return out

        self._model.eval()
        # Trace on a single device. The model is built on `meta`, but some classes keep
        # buffers/constants on `cpu`; FakeTensor refuses to mix devices (e.g. `aten.add`
        # of a meta activation and a cpu buffer — hit on MoE models like MiniMax).
        self._model.to("meta")
        accepted = self._accepted_params()

        # Try input strategies in order and keep the richest result. A clean run (no
        # exception) wins immediately; otherwise we keep whatever ops were captured
        # before a forward blew up — so a model that traces 30 of 40 layers still yields
        # 30 layers of ops instead of nothing. Every strategy is generic: it reads the
        # model's own `main_input_name` / `dummy_inputs` / forward signature, never a
        # hardcoded family or id.
        best: dict[str, list[Operation]] = {}
        for build_inputs in (self._token_inputs, self._declared_dummy_inputs):
            self._reset()
            handles = self._install_hooks()
            try:
                with FakeTensorMode(allow_non_fake_inputs=True), torch.device("meta"):
                    inputs = self._coerce_to_meta(build_inputs(accepted))
                    if not any(_is_tensor(v) for v in inputs.values()):
                        continue  # this strategy can't feed the model; try the next one
                    with torch.no_grad(), _Dispatch():
                        self._model(**inputs)
                return self._ops_by_path  # clean trace — the best we can do
            except Exception:  # noqa: BLE001 — keep the richest partial capture
                if _total_ops(self._ops_by_path) > _total_ops(best):
                    best = self._ops_by_path
            finally:
                for handle in handles:
                    handle.remove()
        return best

    def _accepted_params(self) -> set[str]:
        import inspect

        try:
            return set(inspect.signature(self._model.forward).parameters)
        except (TypeError, ValueError):
            return set()

    def _token_inputs(self, accepted: set[str]) -> dict[str, Any]:
        """Primary strategy: symbolic `input_ids` of shape (B, S) for token models —
        gives the nicest `[B, S, …]` shapes. Skipped when the model's main input isn't
        tokens (e.g. a vision model)."""
        import torch

        main = getattr(self._model, "main_input_name", "input_ids")
        if main != "input_ids" and "input_ids" not in accepted:
            return {}
        inputs: dict[str, Any] = {
            "input_ids": torch.zeros(_BATCH_DUMMY, _SEQ_DUMMY, dtype=torch.long)
        }
        if "use_cache" in accepted:
            inputs["use_cache"] = False
        return inputs

    def _declared_dummy_inputs(self, accepted: set[str]) -> dict[str, Any]:
        """Fallback strategy: the model's own `dummy_inputs` — transformers builds the
        right ones per modality (`pixel_values`, `decoder_input_ids`, `input_features`, …).
        Filtered to the forward signature. Covers vision / seq2seq / audio with no
        per-family code."""
        try:
            declared = dict(getattr(self._model, "dummy_inputs", None) or {})
        except Exception:  # noqa: BLE001 — defensive: the property can raise on odd configs
            declared = {}
        inputs = {k: v for k, v in declared.items() if not accepted or k in accepted}
        if "use_cache" in accepted:
            inputs["use_cache"] = False
        return inputs

    def _coerce_to_meta(self, inputs: dict[str, Any]) -> dict[str, Any]:
        """Force every input tensor onto `meta` so it matches the (meta) params — some
        `dummy_inputs` build cpu tensors that would otherwise trip device propagation."""
        import torch

        return {
            key: (value.to("meta") if isinstance(value, torch.Tensor) else value)
            for key, value in inputs.items()
        }

    def _reset(self) -> None:
        self._stack = []
        self._ops_by_path = {}
        self._producer = {}
        self._counts = {}

    def _install_hooks(self) -> list[Any]:
        handles: list[Any] = []
        for name, module in self._model.named_modules():
            if not name:  # skip the root; its ops belong to no drillable child
                continue
            handles.append(module.register_forward_pre_hook(self._make_push(name)))
            handles.append(module.register_forward_hook(self._make_pop()))
        return handles

    def _make_push(self, name: str):  # noqa: ANN202
        def pre_hook(module: nn.Module, args: tuple) -> None:
            self._stack.append(name)

        return pre_hook

    def _make_pop(self):  # noqa: ANN202
        # Must return None — a forward hook that returns a value *replaces* the
        # module's output.
        def post_hook(module: nn.Module, args: tuple, output: Any) -> None:
            if self._stack:
                self._stack.pop()

        return post_hook

    def _record(self, func: Any, args: tuple, kwargs: dict, out: Any) -> None:
        # Wrapped whole: a single op we can't characterize is skipped, never fatal —
        # recording runs inside the model's forward, so a raise here would abort it.
        try:
            primary = _primary_tensor(out)
            if primary is None:
                return
            base = (
                func._overloadpacket.__name__ if hasattr(func, "_overloadpacket") else str(func)
            )
            if base in _SKIP:
                return

            self._counts[base] = self._counts.get(base, 0) + 1
            op_id = f"{base}_{self._counts[base]}"

            inputs: list[str] = []
            for arg in (*args, *kwargs.values()):
                producer_id = self._producer.get(id(arg)) if _is_tensor(arg) else None
                if producer_id is not None and producer_id not in inputs:
                    inputs.append(producer_id)
            self._producer[id(primary)] = op_id

            scope = self._stack[-1] if self._stack else ""
            self._ops_by_path.setdefault(scope, []).append(
                Operation(
                    id=op_id,
                    op=base,
                    label=_LABEL.get(base, base.replace("_", " ").strip()),
                    category=_CATEGORY.get(base, "other"),
                    inputs=inputs,
                    out_shape=self._symbolize(primary.shape),
                )
            )
        except Exception:  # noqa: BLE001 — best-effort per op
            return

    def _symbolize(self, shape: Any) -> str:
        parts: list[str] = []
        for index, dim in enumerate(tuple(shape)):
            value = int(dim)
            if value == _SEQ_DUMMY:
                parts.append("S")
            elif index == 0 and value == _BATCH_DUMMY:
                parts.append("B")
            else:
                parts.append(str(value))
        return "[" + ", ".join(parts) + "]"


def _total_ops(ops: dict[str, list[Operation]]) -> int:
    return sum(len(value) for value in ops.values())


def _primary_tensor(out: Any) -> Any:
    """The single tensor an op output represents (some ops return tuples)."""
    import torch

    if isinstance(out, torch.Tensor):
        return out
    if isinstance(out, (tuple, list)) and out and isinstance(out[0], torch.Tensor):
        return out[0]
    return None


def _is_tensor(value: Any) -> bool:
    import torch

    return isinstance(value, torch.Tensor)
