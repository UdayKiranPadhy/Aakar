# Custom renderers for module classes

The frontend renders every node through three Strategy registries:

| Registry         | What it resolves                          | Default fallback     |
| ---------------- | ----------------------------------------- | -------------------- |
| `BlockRegistry`  | The React component used as the node card | `GenericBlockNode`   |
| `LayoutRegistry` | Position function for a parent's children | `verticalStack`      |
| `DetailRegistry` | The component shown in the right panel    | `GenericDetailPanel` |

All three are keyed by `node.type`, which is `snake_case(module_class)` — e.g. `LlamaSdpaAttention` → `"llama_sdpa_attention"`, `Linear` → `"linear"`, `LlamaRMSNorm` → `"llama_rms_norm"`. If nothing is registered for a key, the fallback is used. Aakar always renders correctly out of the box; custom renderers are a polish step you reach for when a visual affordance specific to a class would help.

This guide uses **a fan-out diagram for `LlamaSdpaAttention`** as the running example.

## When to write a custom renderer

Reach for one when:
- The default vertical card list misses something visual (e.g. you want Q/K/V on one row, SDPA in the middle, O underneath).
- The class has a parameter worth surfacing in the card itself (e.g. a `window_size` for sliding-window attention).
- A mini-diagram inside the card would help comprehension (e.g. a sparsity-pattern grid).

Otherwise leave it to `GenericBlockNode` — it already shows class name, weight shape, bias presence, and parameter count.

## Step 1 — write the renderer

`frontend/src/presentation/blocks/SdpaAttentionNode.tsx`:

```tsx
import { clsx } from "clsx";
import { Pill } from "../components/ui/Pill";
import { formatParamCount, formatShape } from "../components/ui/format";
import type { BlockNodeProps } from "./BlockRegistry";

export function SdpaAttentionNode({ node, level, selected, onSelect }: BlockNodeProps) {
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
          <Pill tone="neutral">{node.module_class}</Pill>
        </div>
        {/* Whatever extra visual hint helps for SDPA — a Q·Kᵀ/√d mini-equation,
            a head-dim badge, an arrow diagram showing the fan-in. */}
        {node.param_count !== undefined && (
          <div className="mt-2 font-mono text-[11px] text-ink-subtle">
            {formatParamCount(node.param_count)} params
          </div>
        )}
      </div>
    </div>
  );
}
```

## Step 2 — register it

`frontend/src/presentation/blocks/register.ts`:

```ts
import { blockRegistry } from "./BlockRegistry";
import { SdpaAttentionNode } from "./SdpaAttentionNode";

blockRegistry.register("llama_sdpa_attention", SdpaAttentionNode);
```

One line. The registry's resolver picks it up automatically and falls back to `GenericBlockNode` for every other type.

## Step 3 (optional) — custom detail panel

Detail panels follow the same pattern. Create `presentation/details/SdpaAttentionDetail.tsx`, then in `details/register.ts`:

```ts
import { detailRegistry } from "./DetailRegistry";
import { SdpaAttentionDetail } from "./SdpaAttentionDetail";

detailRegistry.register("llama_sdpa_attention", SdpaAttentionDetail);
```

The detail panel is keyed by `node.type` (same as block renderers).

## Step 4 (optional) — custom child layout

If a class's children should fan out instead of stack vertically (e.g. show Q/K/V side by side), register a `LayoutStrategy` keyed by the **parent's** type:

```ts
// presentation/layout/strategies/qkvoFanOut.ts
import type { LayoutStrategy } from "../LayoutRegistry";

export const qkvoFanOut: LayoutStrategy = (children) =>
  children.map((c, i) => ({ id: c.id, x: i * 280, y: 0 }));
```

```ts
// presentation/layout/register.ts
import { layoutRegistry } from "./LayoutRegistry";
import { qkvoFanOut } from "./strategies/qkvoFanOut";

layoutRegistry.register("llama_sdpa_attention", qkvoFanOut);
```

## Finding the right `type` key

`type` is `snake_case(type(module).__name__)` as emitted by the introspector. Common examples:

| `module_class`          | `type` (key for registries) |
| ----------------------- | --------------------------- |
| `Linear`                | `linear`                    |
| `Embedding`             | `embedding`                 |
| `LlamaForCausalLM`      | `llama_for_causal_lm`       |
| `LlamaModel`            | `llama_model`               |
| `LlamaDecoderLayer`     | `llama_decoder_layer`       |
| `LlamaSdpaAttention`    | `llama_sdpa_attention`      |
| `LlamaMLP`              | `llama_mlp`                 |
| `LlamaRMSNorm`          | `llama_rms_norm`            |
| `LlamaRotaryEmbedding`  | `llama_rotary_embedding`    |
| `ModuleList`            | `module_list`               |

Every node carries `module_class` in addition to `type`, so a renderer can also condition on it directly.

## Recap

Adding a custom renderer is always:
1. Write one component file under `presentation/blocks/`, `presentation/details/`, or `presentation/layout/strategies/`.
2. Add a one-line `register()` call in the matching `register.ts`.

No existing components are edited. Fallbacks mean Aakar always works in the meantime — you can ship a feature today and add polish later.
