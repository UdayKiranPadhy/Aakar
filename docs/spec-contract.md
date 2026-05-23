# Spec contract

The **composition Spec** is the JSON shape returned by `GET /api/architecture`. It is the only data structure crossing the wire between the backend and the frontend.

## Source of truth

- **Backend (source of truth)**: `backend/src/aakar_api/domain/spec.py` — Pydantic v2 models.
- **Frontend (hand-mirrored)**: `frontend/src/domain/spec.ts` — TypeScript types.

When the contract changes, this document, both files, and any affected adapters/renderers all update in the same commit.

## Top-level shape

```typescript
type Spec = {
  model_id: string;        // "meta-llama/Llama-3-8B"
  model_type: string;      // "llama" — resolved by the dispatcher
  config_summary: Record<string, string | number | boolean>;
  graph: Node[];           // root nodes in render order
  notes?: string[];        // shown as a banner in the UI
};

type Node = {
  id: string;              // unique within the spec; uses dot-notation
  type: string;            // see "Block types" below
  label: string;           // human-readable, shown in the card title
  meta?: string;           // short subtitle ("self-attention + FFN")
  params: Record<string, string | number | boolean>;
  children?: Node[];       // sub-blocks for nested zoom
  has_internals?: boolean; // true ⇔ children exists and is non-empty
  param_count?: number;    // total parameters in this block
  input_shape?: string;    // "[B, T, 4096]"
  output_shape?: string;
};
```

## Field semantics

| Field          | Required | Notes |
| -------------- | -------- | ----- |
| `id`           | yes      | Stable identifier; the frontend uses it for selection state. Dot-notation indicates hierarchy: `block_1.attn.q`. |
| `type`         | yes      | A string identifier — see catalog. The frontend's `BlockRegistry` looks up a renderer by this. New types are safe (generic renderer handles them). |
| `label`        | yes      | The card's headline. |
| `meta`         | no       | Short subtitle; shown in monospace below the label. |
| `params`       | yes      | Free-form key/value pairs. Rendered in the detail panel's "Configuration" section. |
| `children`     | no       | If present and non-empty, `has_internals` should be `true`. |
| `has_internals` | no      | UI uses this to decide whether to show "Expand internals". |
| `param_count`  | no       | Integer. Displayed in the card and detail panel. `0` means "no learned parameters" (e.g., SDPA, residual). |
| `input_shape` / `output_shape` | no | Free-form shape strings (`"[B, T, 4096]"`). |
| `notes`        | no       | Banner text. Used by `GenericAdapter` to flag fallback rendering. |

## Example: Llama-3-8B (abridged)

```json
{
  "model_id": "meta-llama/Llama-3-8B",
  "model_type": "llama",
  "config_summary": {
    "hidden_size": 4096,
    "num_hidden_layers": 32,
    "num_attention_heads": 32,
    "num_key_value_heads": 8,
    "head_dim": 128,
    "intermediate_size": 14336,
    "vocab_size": 128256,
    "tie_word_embeddings": false
  },
  "graph": [
    {
      "id": "embed",
      "type": "token_embedding",
      "label": "Input embedding",
      "meta": "tokens → vectors",
      "params": { "vocab_size": 128256, "hidden_size": 4096 },
      "param_count": 525336576,
      "input_shape": "[B, T]",
      "output_shape": "[B, T, 4096]"
    },
    {
      "id": "block_1",
      "type": "decoder_block",
      "label": "Transformer block 1",
      "meta": "self-attention + FFN",
      "params": {
        "hidden_size": 4096,
        "num_heads": 32,
        "num_kv_heads": 8,
        "ffn_size": 14336
      },
      "param_count": 218112000,
      "has_internals": true,
      "input_shape": "[B, T, 4096]",
      "output_shape": "[B, T, 4096]",
      "children": [
        { "id": "block_1.norm_1", "type": "rms_norm", "label": "RMSNorm", "meta": "pre-attention norm", "params": { "dim": 4096 }, "param_count": 4096 },
        {
          "id": "block_1.attn",
          "type": "self_attention",
          "label": "Self-attention",
          "meta": "GQA · 32 Q / 8 KV heads",
          "params": { "num_heads": 32, "num_kv_heads": 8, "head_dim": 128, "hidden_size": 4096 },
          "param_count": 41943040,
          "has_internals": true,
          "children": [
            { "id": "block_1.attn.q",    "type": "linear", "label": "Q proj", "params": { "in_features": 4096, "out_features": 4096, "bias": false }, "param_count": 16777216 },
            { "id": "block_1.attn.k",    "type": "linear", "label": "K proj", "params": { "in_features": 4096, "out_features": 1024, "bias": false }, "param_count": 4194304  },
            { "id": "block_1.attn.v",    "type": "linear", "label": "V proj", "params": { "in_features": 4096, "out_features": 1024, "bias": false }, "param_count": 4194304  },
            { "id": "block_1.attn.sdpa", "type": "sdpa",   "label": "Scaled dot-product attention", "meta": "softmax(QKᵀ/√128) · V", "params": { "head_dim": 128 }, "param_count": 0 },
            { "id": "block_1.attn.o",    "type": "linear", "label": "O proj", "params": { "in_features": 4096, "out_features": 4096, "bias": false }, "param_count": 16777216 }
          ]
        },
        { "id": "block_1.add_1",  "type": "residual_add", "label": "+ residual",  "params": {}, "param_count": 0 },
        { "id": "block_1.norm_2", "type": "rms_norm",     "label": "RMSNorm",     "meta": "pre-FFN norm",         "params": { "dim": 4096 }, "param_count": 4096 },
        { "id": "block_1.ffn",    "type": "feed_forward", "label": "Feed-forward", "meta": "SwiGLU · d_ff 14336", "params": { "hidden_size": 4096, "ffn_size": 14336, "activation": "silu" }, "param_count": 176160768 },
        { "id": "block_1.add_2",  "type": "residual_add", "label": "+ residual",  "params": {}, "param_count": 0 }
      ]
    },
    "// ...blocks 2-32 elided...",
    { "id": "final_norm", "type": "rms_norm", "label": "Final RMSNorm", "params": { "dim": 4096 }, "param_count": 4096 },
    { "id": "lm_head",    "type": "lm_head",  "label": "Output layer",  "meta": "logits → probabilities", "params": { "in_features": 4096, "out_features": 128256, "tied": false }, "param_count": 525336576, "input_shape": "[B, T, 4096]", "output_shape": "[B, T, 128256]" }
  ]
}
```

## Example: Generic fallback (`gpt2`)

```json
{
  "model_id": "gpt2",
  "model_type": "gpt2",
  "config_summary": {
    "model_type": "gpt2",
    "vocab_size": 50257
  },
  "graph": [
    {
      "id": "unknown",
      "type": "unknown_architecture",
      "label": "Unrecognized architecture: gpt2",
      "meta": "generic view — see banner",
      "params": { "vocab_size": 50257 }
    }
  ],
  "notes": [
    "Generic rendering — model_type 'gpt2' is not specifically supported. Some architectural details may not be shown accurately."
  ]
}
```

The frontend renders `notes` as an amber banner above the canvas.

## Block type catalog (v0.1)

| `type`                  | Meaning                                            | Adapter that emits it |
| ----------------------- | -------------------------------------------------- | ---------------------- |
| `token_embedding`       | Vocab → hidden lookup table                        | LlamaFamily            |
| `decoder_block`         | One transformer layer                              | LlamaFamily            |
| `rms_norm`              | Root-Mean-Square LayerNorm                         | LlamaFamily            |
| `self_attention`        | Grouped-query attention block                      | LlamaFamily            |
| `linear`                | Dense linear projection (Q, K, V, O)               | LlamaFamily            |
| `sdpa`                  | Scaled dot-product attention                       | LlamaFamily            |
| `feed_forward`          | SwiGLU MLP                                         | LlamaFamily            |
| `residual_add`          | Skip-connection sum                                | LlamaFamily            |
| `lm_head`               | Output projection to vocab logits                  | LlamaFamily            |
| `unknown_architecture`  | Placeholder for the generic fallback               | Generic                |

Adding new types is unrestricted — see [`block-types.md`](./block-types.md). The Pydantic model accepts any string for `type`; the frontend falls back to `GenericBlockNode` if no specific renderer is registered.

## Validation

The Pydantic model enforces:
- All required fields present and the right type.
- `Node` and `Spec` are frozen (immutable after construction).
- Recursive `children` type-checks via Pydantic's forward references.

The frontend trusts the backend; it doesn't re-validate beyond TypeScript's structural typing.
