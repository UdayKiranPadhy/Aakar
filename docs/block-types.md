# Adding a new block type & renderer

The frontend renders every node through three Strategy registries:

| Registry         | What it resolves                       | Default fallback        |
| ---------------- | -------------------------------------- | ----------------------- |
| `BlockRegistry`  | The React component used as the node card | `GenericBlockNode`   |
| `LayoutRegistry` | Position function for a parent's children | `verticalStack`       |
| `DetailRegistry` | The component shown in the right panel | `GenericDetailPanel`   |

All three are keyed by `node.type` (or, for layouts, by the *parent's* `type`). If nothing is registered for a key, the fallback is used. So you can ship a new architecture entirely without writing any frontend code — `GenericBlockNode` will render it. The custom renderers are a polish step.

This guide uses **sparse attention** as the running example. Substitute any block type you're studying.

## When to write a custom renderer

Write a custom block renderer when you want type-specific visual affordances:
- A different inner layout (e.g., showing a sparsity pattern grid for sparse attention).
- A different color or border for emphasis.
- A diagram inside the block (e.g., a mini matrix for SDPA).

Otherwise, leave it to `GenericBlockNode`.

## Step 1 — Backend: emit the new type

The frontend can only render what the backend emits. First, make the adapter produce a node with `type: "sparse_attention"`.

In `backend/src/aakar_api/adapters/building/param_formulas.py`, add a formula:

```python
def sparse_attention_params(hidden_size: int, head_dim: int, num_heads: int, sparsity_pattern_size: int) -> int:
    # Q/K/V/O projections are unchanged from dense MHA; the sparsity is in
    # the softmax mask, not the parameter count. Just the QKVO linears.
    return 4 * hidden_size * head_dim * num_heads
```

In the relevant adapter (existing or new — see [`adapters.md`](./adapters.md)), use `BlockBuilder`:

```python
sparse_attn_node = (
    BlockBuilder(f"{block_id}.attn", "sparse_attention")
    .label("Sparse self-attention")
    .meta(f"window={window_size}")
    .params(num_heads=..., head_dim=..., window=window_size)
    .param_count(sparse_attention_params(...))
    .children([...])  # Q, K, V, masked SDPA, O — similar to dense attention
    .build()
)
```

Now the API emits nodes with `type: "sparse_attention"`. The frontend's `GenericBlockNode` will render them out of the box.

## Step 2 — Frontend: write a custom renderer

`frontend/src/presentation/blocks/SparseAttentionNode.tsx`:

```tsx
import { clsx } from "clsx";
import { Pill } from "../components/ui/Pill";
import { formatParamCount } from "../components/ui/format";
import type { BlockNodeProps } from "./BlockRegistry";

export function SparseAttentionNode({ node, level, selected, onSelect, onExpand }: BlockNodeProps) {
  const width = level === 1 ? 300 : 280;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(node.id)}
      style={{ width }}
      className={clsx(
        "relative cursor-pointer rounded-block bg-white shadow-block",
        selected ? "border-2 border-accent" : "border-hairline border-hairline",
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className={clsx("font-sans text-sm font-medium", selected && "text-accent")}>
            {node.label}
          </span>
          <Pill tone="neutral">sparse</Pill>
        </div>
        {node.meta && <div className="mt-1 font-mono text-[11px] text-ink-muted">{node.meta}</div>}
        {/* Custom inner: render a tiny sparsity pattern visualization here */}
        <SparsityPatternMini windowSize={(node.params.window as number) ?? 0} />
        {node.param_count !== undefined && (
          <div className="mt-2 font-mono text-[11px] text-ink-subtle">
            {formatParamCount(node.param_count)} params
          </div>
        )}
      </div>
      {/* "Expand internals" pill omitted for brevity — copy from GenericBlockNode if needed */}
    </div>
  );
}
```

## Step 3 — Register it

`frontend/src/presentation/blocks/register.ts`:

```ts
import { blockRegistry } from "./BlockRegistry";
import { SparseAttentionNode } from "./SparseAttentionNode";

blockRegistry.register("sparse_attention", SparseAttentionNode);
```

One line. The registry's resolver picks it up automatically.

## Step 4 (optional) — Custom detail panel

If the right-side detail panel should show extra info for this type (e.g., a sparsity-pattern explanation, or links to the paper):

```tsx
// presentation/details/SparseAttentionDetail.tsx
export function SparseAttentionDetail({ node, onExpand, onClose }: DetailPanelProps) {
  return (
    <div className="flex h-full w-[320px] flex-col border-l border-hairline bg-white">
      {/* Your custom layout — refer to GenericDetailPanel for the visual skeleton */}
    </div>
  );
}
```

Register in `details/register.ts`:

```ts
import { detailRegistry } from "./DetailRegistry";
import { SparseAttentionDetail } from "./SparseAttentionDetail";

detailRegistry.register("sparse_attention", SparseAttentionDetail);
```

## Step 5 (optional) — Custom child layout

If clicking "Expand internals" on a `sparse_attention` block should show its children in a different layout than the default `verticalStack`, register a layout strategy keyed by the **parent's** type:

```ts
// presentation/layout/strategies/sparseFanOut.ts
import type { LayoutStrategy } from "../LayoutRegistry";

export const sparseFanOut: LayoutStrategy = (children) => {
  // your positions — e.g., Q/K/V row, masked-SDPA in center with sparsity mini-diagram, O below
  return children.map((c, i) => ({ id: c.id, x: i * 280, y: 0 }));
};
```

Register in `layout/register.ts`:

```ts
import { layoutRegistry } from "./LayoutRegistry";
import { sparseFanOut } from "./strategies/sparseFanOut";

layoutRegistry.register("sparse_attention", sparseFanOut);
```

## Done

To add a new block type with full custom rendering:
1. Backend: parameter formula + `BlockBuilder` usage in the adapter (new `type` string).
2. Frontend (optional): custom block renderer + one-line `register()`.
3. Frontend (optional): custom detail panel + one-line `register()`.
4. Frontend (optional): custom layout strategy + one-line `register()`.

Every step is a new file plus a registration line — zero edits to existing components or registries (OCP). The fallbacks ensure incremental shipping: you can do just step 1 today and the type still renders correctly via the generic card, then add custom polish later.

## Block type catalog (v0.1)

For reference, the types currently emitted by the Llama-family adapter:

| `type`                  | Where it appears                                  | Has children? |
| ----------------------- | ------------------------------------------------- | ------------- |
| `token_embedding`       | Level 1 root, first node                          | no            |
| `decoder_block`         | Level 1, one per transformer layer                | yes (6)       |
| `rms_norm`              | Level 2 (pre-attn, pre-FFN, final)                | no            |
| `self_attention`        | Level 2                                           | yes (5)       |
| `linear`                | Level 3 (Q, K, V, O projections)                  | no            |
| `sdpa`                  | Level 3 (Scaled dot-product attention)            | no            |
| `feed_forward`          | Level 2                                           | no            |
| `residual_add`          | Level 2                                           | no            |
| `lm_head`               | Level 1, last node                                | no            |
| `unknown_architecture`  | Emitted by `GenericAdapter`                       | no            |
