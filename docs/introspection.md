# Introspection

Aakar's backend builds the architecture `Spec` by **introspecting the real `transformers` nn.Module tree**, not by interpreting `config.json` directly. This document explains how that works and what to expect.

## The flow

`backend/src/aakar_api/infrastructure/transformers_introspector.py` is the public entrypoint.
The focused helpers under `backend/src/aakar_api/infrastructure/introspection/` keep each
step readable: config loading, model construction, node walking, per-node metadata, and
spec-level metadata.

1. **Fetch the config.** `AutoConfig.from_pretrained(model_id)` — talks to the HF Hub once (or hits the local cache). No weights downloaded.
2. **Resolve the architecture class.** Read `config.architectures[0]` (e.g. `"LlamaForCausalLM"`) and look it up as an attribute on the `transformers` module: `cls = getattr(transformers, arch_name)`.
3. **Build on the meta device.** Inside `accelerate.init_empty_weights()`, instantiate `model = cls(config)`. Every `nn.Parameter` lives on the `meta` device — its `.shape` is real, its memory footprint is zero.
4. **Walk `named_children()` recursively.** Emit one `Node` per `nn.Module`. For each leaf, capture `module.weight.shape`, `module.bias.shape`, and the per-subtree `sum(p.numel() for p in module.parameters(recurse=True))`.
5. **Return a `Spec`.** Top-level `graph` has one element (the root module). `config_summary` exposes a curated subset of config fields plus `total_params`.

Heavy synchronous work runs in `asyncio.to_thread` so FastAPI's event loop stays responsive.

## Forward operations (per-module ops)

The tree above shows *which* modules exist; `Node.operations` shows *what each module's
`forward()` actually computes* — the matmuls, softmax, scaling, residual adds, RoPE math,
and reshapes that the module-tree alone can't reveal. It's produced by
`infrastructure/introspection/fx_operations.py` as a refinement pass inside `build_spec`.

**How it works — and why it isn't FX.** The obvious tool (`torch.fx.symbolic_trace` /
transformers' old `HFTracer`) is a dead end here: stock FX chokes on the data-dependent
control flow in modern `transformers` forwards, and `transformers.utils.fx` was *removed in
transformers v5*. Instead we run **one forward pass under a `FakeTensorMode`**:

- transformers' `is_tracing()` returns true when the tensors are fake, so the library takes
  its trace-friendly branches and skips value-dependent ones a `meta` tensor can't run
  (e.g. `find_packed_sequence_indices`, which calls `.item()`).
- fake tensors carry shapes but allocate nothing and run no kernels — so the pass keeps the
  model on `meta`, **downloads nothing, initializes no weights**, and is essentially free.

A `TorchDispatchMode` observes every ATen op the forward dispatches; `forward` hooks maintain
a stack of the module currently executing, so each op is attributed to the innermost
`nn.Module`. That attribution is exact and family-agnostic: a `Linear` reports its `mm`, an
RMSNorm `pow/mean/rsqrt/mul`, a decoder layer its two residual `add`s, attention its
Q·Kᵀ / softmax / ·V math (SDPA decomposes, so the softmax is visible even under
`attn_impl: "sdpa"`). MoE models work too — the router and experts report their ops.

**Robustness — and it's all generic.** Nothing keys off a model family or id; the tracer reads
only the model's own `main_input_name` / `dummy_inputs` / forward signature and stable ATen
op names. Specifically:

- **Single device.** The model is moved to `meta` and the forward runs under `torch.device("meta")`,
  and inputs are coerced to `meta` — otherwise a cpu buffer added to a meta activation trips
  FakeTensor's device check (this silently zeroed out every MoE/buffer-heavy model before the fix).
- **Adaptive inputs.** It first feeds a symbolic `input_ids` of shape `(1, S)` (nicest `[B, S, …]`
  shapes), then falls back to the model's *own* `dummy_inputs` (transformers builds the right ones
  per modality — `pixel_values`, `decoder_input_ids`, …). `use_cache` is passed only when the
  signature accepts it, so encoder-style models don't die on an unexpected kwarg.
- **Partial capture.** If a forward blows up partway (e.g. unguarded data-dependent control flow,
  or an op with no meta kernel), the ops captured *before* the failure are kept — a model that
  traces 30 of 40 layers yields 30 layers of ops, not nothing.
- **Never fatal.** Per-op recording and the whole pass are wrapped, so a model that can't trace
  at all just gets no `operations`; the module tree (which works for *every* stock-transformers
  model) is never affected.

What still won't trace: forwards needing an input the model doesn't declare in `dummy_inputs`,
ops with no meta kernel (flash-attention-2 kernels, some quantized layers), and unguarded
value-dependent control flow — all of which now degrade to *partial or empty* ops rather than
breaking anything.

## Why introspection, not adapters

Earlier versions of Aakar shipped per-family `ArchitectureAdapter` classes that emitted nodes based on the maintainer's mental model of how `config.json` maps to layers. That approach was a guess: which projections have biases, whether Q/K/V are fused, what activation the FFN uses — all interpreted from config flags. The user could request `meta-llama/Llama-3-8B` and see a card labeled "Q proj" with a parameter count derived from a formula, not from the actual tensor.

Introspection collapses that surface area. The Spec the frontend renders now mirrors the exact `nn.Module` tree the HuggingFace source defines — same submodule names, same tensor shapes, same parameter counts. New architectures (MoE variants, state-space models, sparse attention) are picked up automatically as soon as `pip install -U transformers` makes the class available.

## Security: no `trust_remote_code`

Aakar refuses to load models that require `trust_remote_code=True`. If `config.architectures[0]` does not resolve to a class on the stock `transformers` module, the introspector raises `UnsupportedArchitecture` and the API returns HTTP 422 with `kind: "unsupported_architecture"`. The frontend renders an explanatory banner.

This is non-negotiable: enabling `trust_remote_code` would mean executing arbitrary Python from random HF repos on the backend.

## Caching

`backend/src/aakar_api/infrastructure/spec_cache.py` provides `DiskSpecCache`. The cache key is `(model_id, sha256(config_dict)[:12])`:

- The model id keeps results separated per HF repo.
- The config hash means fine-tuned forks or local config edits invalidate naturally.

Files live under `backend/.cache/specs/` (gitignored). Each file holds one `Spec.model_dump_json()` payload. Cold lookups hit the introspector; warm lookups round-trip the cached JSON in ~10 ms.

`ArchitectureService` orchestrates the flow:

```python
async def get_architecture(self, model_id: str) -> Spec:
    config_hash = await self._introspector.fetch_config_hash(model_id)
    cached = await self._cache.get(model_id, config_hash)
    if cached is not None:
        return cached
    spec = await self._introspector.introspect(model_id)
    await self._cache.set(model_id, config_hash, spec)
    return spec
```

`fetch_config_hash` is a fast variant that loads the config but doesn't build the module tree — it's the price of detecting cache misses cheaply.

## Edge cases and gotchas

- **Large module trees.** Llama-3-8B has ~290 modules. The wire payload is ~30–60 KB JSON, easily handled by the browser. Models with 100+ layers (e.g. Llama-3-405B) will produce larger Specs — fine on broadband, may need pagination on slow links.
- **`ModuleList` is a node.** A 32-layer model has its 32 `LlamaDecoderLayer`s as siblings under a `ModuleList` parent. The frontend can choose to collapse same-class siblings visually; the wire format keeps the literal tree.
- **Init warnings.** Models with `pad_token_id = -1` etc. emit harmless `UserWarning`s during config load. They're ignorable.
- **`init_empty_weights` is not magic.** Some custom classes inside transformers do shape-dependent CPU allocations in their `__init__`. If a model OOMs during introspection, file an upstream bug; we do not work around it.
- **`operations` adds to the payload.** Per-module ops are attached to every module that ran (so every decoder layer carries its own, even though they're identical). Fine for study-sized models; for very deep models this is the obvious thing to dedupe later (attach to a representative layer only).

## Adding new architectures

In most cases: **do nothing.** When `transformers` ships support for a new model family, the next `uv lock --upgrade-package transformers` makes it available in Aakar with zero source changes.

If a new family wants a *custom visualization* (e.g. an MoE router diagram, a sparse attention pattern), register a renderer in the frontend — see [`block-types.md`](./block-types.md). The backend stays untouched.

## Testing

- `backend/tests/unit/test_introspector.py` loads `hf-internal-testing/tiny-random-LlamaForCausalLM` (a ~1 MB test model) end-to-end and asserts on the produced Spec shape.
- `backend/tests/unit/test_fx_operations.py` traces the same tiny model and asserts the per-module `operations` (attention has a `bmm` + softmax, the decoder layer has its residual `add`s, a leaf `Linear` has its `mm`), plus graceful degradation when a model can't be traced.
- `backend/tests/unit/test_spec_cache.py` round-trips Specs through the disk cache.
- `backend/tests/integration/test_architecture_route.py` injects a fake `ArchitectureService` via `app.dependency_overrides` and exercises the full HTTP + error-handler path without touching transformers.
