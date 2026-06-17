# Spec contract

The **composition Spec** is the JSON shape returned by `GET /api/architecture` (the module tree, fast) and `GET /api/operations` (the same tree with each module's forward-pass `operations` filled in, slower). It is the only data structure crossing the wire between the backend and the frontend.

## Source of truth

- **Backend (source of truth)**: `backend/src/aakar_api/domain/spec.py` — Pydantic v2 models.
- **Frontend (hand-mirrored)**: `frontend/src/domain/spec.ts` — TypeScript types.

When the contract changes, this document and both files update in the same commit.

## Top-level shape

```typescript
type Spec = {
  model_id: string;        // "meta-llama/Llama-3-8B"
  model_type: string;      // "llama" — from config.model_type
  config_summary: Record<string, string | number | boolean | object>;
  graph: Node[];           // root nodes in render order (usually one)
  notes?: string[];        // shown as a banner in the UI
  param_dtype?: string;    // "float16" | "bfloat16" | "float32" — from config.torch_dtype
  attn_impl?: string;      // "eager" | "sdpa" | "flash_attention_2"
  position_encoding?: string; // "rope" | "alibi" | "learned" | "sinusoidal"
  tied_word_embeddings?: boolean; // checked on the meta-instantiated model
  flops_reference?: { batch_size: number; seq_len: number }; // assumed dims for Node.flops
  config_full?: Record<string, unknown>; // full config.to_dict() — NOT key-filtered
  operations_traced?: boolean; // false from /architecture, true from /operations once traced
};

type Node = {
  id: string;              // module_path (e.g. "model.layers.0.self_attn.q_proj"); root uses class name
  type: string;            // snake_case(module_class) — drives BlockRegistry lookup
  label: string;           // card title — last path segment, humanized
  meta?: string;           // module class name shown under the title
  params: Record<string, string | number | boolean>;
  children?: Node[];       // recursive — mirrors named_children() of the nn.Module
  has_internals?: boolean; // true ⇔ children non-empty
  param_count?: number;    // recursive sum of p.numel() for this subtree
  input_shape?: string;    // symbolic "[B, S, 4096]" — derived from the module type + config.hidden_size
  output_shape?: string;
  module_class?: string;   // e.g. "LlamaSdpaAttention", "Linear", "LlamaRMSNorm"
  module_path?: string;    // full attribute path, same as id for non-root
  weight_shape?: number[]; // ground-truth from nn.Parameter.shape (meta device)
  bias_shape?: number[];
  memory_bytes?: number;   // param_count × bytes_per_element at Spec.param_dtype
  buffers?: Record<string, number[]>; // non-parameter tensors (RoPE inv_freq, masks)
  category?: string;       // namespace-derived tag (e.g. "activation"); frontend uses it as a fallback registry key
  role?: string;           // fact-based semantic role ("attention" | "mlp" | "moe" | "norm" | "layer_stack" | …)
  source_url?: string;     // GitHub link to the class definition (HF transformers / PyTorch)
  flops?: number;          // theoretical forward FLOPs at Spec.flops_reference (Linear / norms only)
  intermediates?: Record<string, string>; // per-class intermediate shapes (attention q/k/v/scores, MLP up)
  operations?: Operation[]; // ops this module's own forward() runs (fake-tensor trace); from /operations, best-effort
};

type Operation = {
  id: string;          // unique within the whole trace; referenced by other ops' `inputs`
  op: string;          // ATen op name as dispatched: "mm", "bmm", "_safe_softmax", "add", "silu"
  label: string;       // humanized op name: "batched matmul", "softmax"
  category: string;    // matmul | activation | norm | elementwise | shape | embedding | attention | other
  inputs: string[];    // ids of the ops that produced this op's input tensors (dataflow edges)
  out_shape?: string;  // symbolic "[B, 32, S, S]" (batch → B, sequence → S, rest literal)
};
```

## Field semantics

| Field          | Required | Notes |
| -------------- | -------- | ----- |
| `id`           | yes      | Equal to `module_path` for non-root nodes; root uses the class name (`LlamaForCausalLM`). |
| `type`         | yes      | `snake_case(module_class)`. The frontend's `BlockRegistry` looks up a custom renderer by this; `GenericBlockNode` is the fallback. |
| `label`        | yes      | The card's headline — heuristic from the last path segment (`q_proj` → "Q proj", `0` → "Layer 0"). |
| `meta`         | no       | The Python class name; gives users a direct breadcrumb to the HF source. |
| `params`       | yes      | Module-config bag: `in_features`, `num_heads`, `eps`, etc. Drawn from common `nn.Module` attributes when present. |
| `children`     | no       | Real submodule tree — emitted in the order `nn.Module.named_children()` returns them. |
| `has_internals` | no      | `true` ⇔ `children` has entries. UI shows the "Expand internals" pill. |
| `param_count`  | no       | Sum of `p.numel()` across all params in this subtree (recursive). |
| `input_shape` / `output_shape` | no | Free-form. Reserved for future symbolic tracing; currently unused. |
| `module_class` | no       | Exact Python class name from `type(module).__name__`. Useful when comparing two model families. |
| `module_path`  | no       | The dotted attribute path. Lets users grep the HF source verbatim. |
| `weight_shape` / `bias_shape` | no | Tensor shapes captured from `module.weight.shape` / `module.bias.shape`. None for modules without that parameter. |
| `memory_bytes` | no       | `param_count × bytes_per_element` using `Spec.param_dtype` (not the meta device's default fp32). Recursive — same scope as `param_count`. |
| `buffers`      | no       | Map of this module's *own* (non-recursive) `register_buffer` tensors → shape. Captures RoPE `inv_freq`, causal masks, running stats. |
| `source_url`   | no       | GitHub permalink to the module's class definition. Populated for `transformers.*` and `torch.*` classes — pinned to the installed package's semver tag (`v5.9.0`) when one matches, else `main`. Includes a `#L<line>` anchor pointing to the `class X(nn.Module):` line. Custom user code is left without a link. Renders as a clickable class name in the detail panel's Source section. |
| `category`     | no       | Free-form semantic tag derived purely from the module's Python namespace — no class-name matching, so every class within a namespace is tagged automatically. Current values: `"activation"` (`torch.nn.modules.activation`, `transformers.activations`), `"norm"` (`torch.nn.modules.normalization`, `torch.nn.modules.batchnorm`), `"dropout"`, `"linear"`, `"embedding"` (`torch.nn.modules.sparse`), `"container"` (`ModuleList`, `Sequential`, `ModuleDict`, …). The frontend's `BlockRegistry` looks this up *after* `type`, so one renderer can serve every class in a category without enumerating them. |
| `role`         | no       | The module's **semantic role**, decided from facts only — config dims (head counts, FFN width, expert/layer counts, vocab) + real tensor shapes + namespace `category` + structure — and **never** from class/attribute/child names (see `infrastructure/introspection/role.py`). Values: `"layer_stack"` (the decoder ModuleList, length == num_hidden_layers), `"container"`, `"norm"`, `"token_embedding"` / `"position_embedding"` / `"embedding"`, `"attention"` (block carrying head-width projections), `"mlp"` / `"moe"` (FFN block by intermediate width; `moe` when experts are present), `"lm_head"` (Linear to vocab), `"linear"`. Absent when no rule proves a role — the UI renders a generic card. Both the canvas semantic flow and the Token Journey segment a model purely off this field, so they always agree. |
| `flops`        | no       | Theoretical forward-pass FLOPs at `Spec.flops_reference`. Populated only for modules with closed-form formulas: `Linear` (2·S·in·out), norms (~5·S·H), `Embedding` (0). |
| `intermediates` | no      | Symbolic shapes of tensors that live *inside* opaque blocks, emitted per the module's `role` from config facts (never attribute/child names). `role: "attention"` reports `q`, `k`, `v` (with GQA grouping on K/V) and `attn_scores` (the `[B, num_heads, S, S]` quadratic intermediate); `role: "mlp"`/`"moe"` report `up` (the `[B, S, intermediate_size]` expansion). |
| `operations`   | no       | The ATen ops this module's **own** `forward()` runs, in execution order (a submodule's ops live on that submodule's Node, so a `Linear` reports its `mm`, an RMSNorm `pow/mean/rsqrt/mul`, a decoder layer its two residual `add`s, attention its Q·Kᵀ / softmax / ·V math). Populated only by **`GET /api/operations`**, never `/architecture` (the trace is the slow part of introspection, so it's fetched lazily — see below). Captured by a single fake-tensor trace — **best-effort**: absent when a model can't be traced, and the module tree renders regardless. See the `Operation` semantics below. |
| `notes`        | no       | Optional UI banner. Currently unused after the adapter system was removed. |

### `Operation` semantics

| Field | Notes |
| ----- | ----- |
| `id`  | Unique within the whole trace (e.g. `"bmm_2"`). Other ops reference it in `inputs`, so a dataflow graph can be rebuilt from a flat list. |
| `op`  | The raw ATen op name as dispatched (`mm`, `bmm`, `_safe_softmax`, `add`, `silu`, `embedding`, `view`, …). Ground truth at torch's dispatch level — note SDPA decomposes to `bmm → _safe_softmax → bmm`, so the attention math is visible even under `attn_impl: "sdpa"`. |
| `label` | A friendlier display name for `op` (e.g. `bmm` → "batched matmul", `_safe_softmax` → "softmax"); falls back to the raw name. |
| `category` | Coarse bucket for colour/grouping: `matmul`, `activation`, `norm`, `elementwise`, `shape`, `embedding`, `attention`, `other`. Keyed off the stable ATen op name — **never** off the model family. |
| `inputs` | `id`s of the ops (anywhere in the trace) that produced this op's tensor arguments — the edges of the forward dataflow graph. |
| `out_shape` | Symbolic shape of the op's primary output. The trace runs with `B=1, S=251` (a distinctive prime) and rewrites those dims to `B`/`S`; all other dims stay literal. Absent when the op has no single tensor output. |

### Spec-level fields

| Field | Notes |
| ----- | ----- |
| `param_dtype` | Cleaned form of `config.torch_dtype` (`torch.float16` → `"float16"`). Drives `Node.memory_bytes`. |
| `attn_impl` | From `config._attn_implementation` (the kernel transformers itself dispatches on), defaulting to `"eager"` when unset. No class-name sniffing. |
| `position_encoding` | `"rope"` if `config.rope_theta`/`rope_scaling` is set; `"learned"` if a second embedding table sized to `max_position_embeddings` is present (a shape fact). No `"Rotary"`/`"ALiBi"`/`wpe` class-or-name matching — absent when neither fact holds. |
| `tied_word_embeddings` | `model.get_input_embeddings().weight is model.get_output_embeddings().weight` after meta-instantiation. Config flag isn't always honored at runtime. |
| `flops_reference` | `{batch_size, seq_len}` assumed when computing each `Node.flops`. Defaults to `{1, 2048}`. |
| `config_full` | The complete `config.to_dict()` — every key, unfiltered (unlike the curated `config_summary`). Backs a generic Config Explorer that must not drop fields as `transformers` evolves. May contain nested sub-configs. Adds ~KB to the cached Spec JSON. |
| `operations_traced` | `false` from `GET /api/architecture` (structure only); `true` from `GET /api/operations` once the fake-tensor trace has run — *even if it found no ops* (the trace is best-effort). Lets the frontend tell "not traced yet" (still fetching) from "traced, none found", and lets the cache skip re-tracing a model that legitimately yields nothing. |

### Extra `config_summary` keys

Beyond the base config fields, the summary may include:
- `gqa_ratio` (derived) — `num_attention_heads / num_key_value_heads`. `1` = MHA, `>1` = GQA, `=num_attention_heads` = MQA.
- `sliding_window` — Mistral/Qwen2 windowed-attention size.
- `bos_token_id`, `eos_token_id`, `pad_token_id` — special-token IDs from the config.
- `num_local_experts`, `num_experts_per_tok` — Mixtral/Qwen-MoE.
- `quantization_config` — flat dict from `config.quantization_config.to_dict()` (GPTQ/AWQ/bnb).

## How the Spec is produced

The backend's `TransformersIntrospector` (`backend/src/aakar_api/infrastructure/transformers_introspector.py`) builds the Spec in two modes, so the slow trace stays off the structure path:

- **`introspect`** (serves `GET /api/architecture`) runs steps 1–4 and returns the module tree with `operations_traced: false`.
- **`introspect_with_operations`** (serves `GET /api/operations`) runs steps 1–4 **and** step 5, returning the same tree with `operations` filled in and `operations_traced: true`.

1. Calls `AutoConfig.from_pretrained(model_id)` (no weights).
2. Reads `config.architectures[0]` and resolves it to a concrete class on the `transformers` module (e.g. `transformers.LlamaForCausalLM`). If the class is not bundled with stock transformers — i.e. the model would require `trust_remote_code=True` — the request fails with HTTP 422 `unsupported_architecture`.
3. Instantiates the class inside `accelerate.init_empty_weights()` so all `nn.Parameter`s live on the meta device (zero RAM).
4. Walks `model.named_children()` recursively, producing one `Node` per `nn.Module`. Tensor shapes are read from `module.weight.shape` etc.; `param_count` is `sum(p.numel() for p in module.parameters(recurse=True))`.
5. *(operations build only)* Runs one **fake-tensor trace** of `forward()` (`infrastructure/introspection/fx_operations.py`) to populate `Node.operations`. The model stays on `meta`; the pass runs under a `FakeTensorMode` (so transformers' `is_tracing()` is true and its data-dependent branches are skipped), observing every ATen op via a `TorchDispatchMode` and attributing each to the innermost executing module via `forward` hooks. No weights, no real compute, no I/O. Best-effort — a model that won't trace simply gets no `operations` (the steps above are unaffected). This replaces the FX/`HFTracer` approach, which doesn't work on transformers v5 (the module was removed) or with modern forwards' control flow.

The frontend fetches `/architecture` first (instant tree), then `/operations` in the background and swaps the enriched Spec in (see `useArchitecture`), so the trace never blocks the first paint.

## Caching

Results are cached by `DiskSpecCache` at `backend/.cache/specs/{model_id_safe}.v{schema}.json` (and, when `REDIS_URL` is set, a shared `RedisSpecCache` tier behind it). The key is the **model id + a schema version** — *no config hash*, because computing one would cost a Hub round-trip on every request, warm hits included, which is exactly the latency the id-only key removes. The schema version invalidates payloads written by older code; a config edited in place is bounded by the Redis TTL (default 60 days) rather than invalidated instantly — acceptable for a study tool. A model's entry is **upgraded in place** from structure-only (written by `/architecture`) to fully-traced (written by `/operations`), so once traced both endpoints read warm.

## Example: Llama-3-style (abridged)

```json
{
  "model_id": "meta-llama/Llama-3-8B",
  "model_type": "llama",
  "param_dtype": "bfloat16",
  "attn_impl": "sdpa",
  "position_encoding": "rope",
  "tied_word_embeddings": false,
  "flops_reference": { "batch_size": 1, "seq_len": 2048 },
  "config_summary": {
    "total_params": 8030261248,
    "hidden_size": 4096,
    "num_hidden_layers": 32,
    "num_attention_heads": 32,
    "num_key_value_heads": 8,
    "head_dim": 128,
    "vocab_size": 128256,
    "tie_word_embeddings": false,
    "gqa_ratio": 4,
    "bos_token_id": 128000,
    "eos_token_id": 128001
  },
  "graph": [
    {
      "id": "LlamaForCausalLM",
      "type": "llama_for_causal_lm",
      "label": "LlamaForCausalLM",
      "module_class": "LlamaForCausalLM",
      "param_count": 8030261248,
      "memory_bytes": 16060522496,
      "input_shape": "[B, S]",
      "output_shape": "[B, S, 128256]",
      "has_internals": true,
      "params": {},
      "children": [
        {
          "id": "model.embed_tokens",
          "type": "embedding",
          "label": "Embed tokens",
          "meta": "Embedding",
          "module_class": "Embedding",
          "module_path": "model.embed_tokens",
          "weight_shape": [128256, 4096],
          "param_count": 525336576,
          "memory_bytes": 1050673152,
          "input_shape": "[B, S]",
          "output_shape": "[B, S, 4096]",
          "flops": 0,
          "params": { "num_embeddings": 128256, "embedding_dim": 4096 }
        },
        {
          "id": "lm_head",
          "type": "linear",
          "label": "Lm head",
          "meta": "Linear",
          "module_class": "Linear",
          "module_path": "lm_head",
          "weight_shape": [128256, 4096],
          "param_count": 525336576,
          "memory_bytes": 1050673152,
          "input_shape": "[B, S, 4096]",
          "output_shape": "[B, S, 128256]",
          "flops": 2151677988864,
          "params": { "in_features": 4096, "out_features": 128256, "has_bias": false }
        }
      ]
    }
  ]
}
```

## Error envelope

When introspection fails the API returns a JSON body with `kind`:

| HTTP | `kind`                       | Raised by |
| ---- | ---------------------------- | --------- |
| 404  | `model_not_found`            | `RepositoryNotFoundError` / `EntryNotFoundError` from huggingface-hub. |
| 403  | `model_gated`                | `GatedRepoError` — the model is private. |
| 422  | `unsupported_architecture`   | `config.architectures[0]` does not resolve to a class in stock `transformers`. |
| 503  | `hub_unavailable`            | An upstream HTTP dependency (HF Hub, etc.) timed out or returned 5xx. Transient — retryable. Raised by the `/api/model-info`, `/api/model-readme`, `/api/models` routes. |

Body shape:
```json
{ "kind": "unsupported_architecture", "message": "...", "model_id": "...", "architecture": "DeepSeekV3" }
```

## Validation

The Pydantic model enforces:
- All required fields present and the right type.
- `Node` and `Spec` are frozen (immutable after construction).
- Recursive `children` type-checks via Pydantic's forward references.

The frontend trusts the backend; it doesn't re-validate beyond TypeScript's structural typing.
