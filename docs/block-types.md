# Custom renderers for module classes

The frontend renders every node through three Strategy registries:

| Registry         | What it resolves                          | Default fallback     |
| ---------------- | ----------------------------------------- | -------------------- |
| `BlockRegistry`  | The React component used as the node card | `GenericBlockNode`   |
| `LayoutRegistry` | Position function for a parent's children | `verticalStack`      |
| `DetailRegistry` | The component shown in the right panel    | `GenericDetailPanel` |

Resolution is tiered (most specific wins, then the fallback):

| Registry         | Resolution order                                              |
| ---------------- | ------------------------------------------------------------ |
| `BlockRegistry`  | `type` → `category` → `role` → `GenericBlockNode`            |
| `DetailRegistry` | `type` → `role` → `GenericDetailPanel`                       |
| `LayoutRegistry` | `type` (parent) → `verticalStack`                            |

- **`type`** is `snake_case(module_class)` — e.g. `LlamaSdpaAttention` → `"llama_sdpa_attention"`, `Linear` → `"linear"`. Model-specific.
- **`category`** is the backend's namespace tag (`"activation"`, `"norm"`, …) — shared by many classes.
- **`role`** is the backend's **fact-derived** semantic role (`"attention"`, `"moe"`, `"norm"`, `"mlp"`, `"lm_head"`, …), decided from config dims + real tensor shapes — never class names — and set to `null` when unproven. This is the **family-agnostic** key: register once on `"attention"` and every Llama/Qwen/Mistral/… attention block matches, with no class enumeration. Because the backend only sets `role` when a rule proves it, a role match is guaranteed correct.

If nothing is registered for a node, the fallback is used. Aakar always renders correctly out of the box; custom renderers are a polish step.

> **Prefer `role` (or `category`) over `type` for concept renderers.** Attention and MoE blocks have no stable `type` (it varies per model family) and no useful `category`, so the only correct key is `role`. Enumerating `register("llama_sdpa_attention", …)`, `register("mistral_attention", …)`, … hardcodes class names and silently misses families — exactly what `role` exists to avoid.

> **Layouts for attention / MLP / MoE internals are special.** When you drill into a `layer_stack`, a decoder layer, an attention block, or an MLP/MoE block, the canvas's `presentation/canvas/semanticFlow.ts` builder synthesizes the nodes **and supplies its own positions and edges**, bypassing `LayoutRegistry` entirely. So a custom *layout* keyed on `self_attention`/`sdpa`/`moe` will not run on the live path. To visualize what's *inside* one of these concepts, put the visual in a **block renderer** (drawn inside the card, like `MoeBlockNode`'s expert grid) or a **detail panel** (keyed on `role`, like `AttentionDetail`'s GQA diagram) — not a layout. `verticalStack`/`fanOut`/`headGrid`/`expertFanOut` still apply on the generic layout path (root view, leaves, and any parent `semanticFlow` doesn't claim).

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

### Category-based renderers

Sometimes one renderer should cover *many* classes that share a role — e.g. every activation function (`SiLU`, `GELU`, `ReLU`, HF's `GELUActivation`, …). Hard-coding the snake-cased class names defeats the point.

Instead, the backend tags each `Node` with a `category` field (`"activation"`, with room for `"norm"`, `"dropout"`, … later). `BlockRegistry.registerCategory(category, Component)` registers a renderer keyed on that tag, and `resolve()` falls back to it when no `type`-specific renderer is registered:

```ts
// presentation/blocks/register.ts
import { ActivationNode } from "./ActivationNode";

blockRegistry.registerCategory("activation", ActivationNode);
```

`ActivationNode` then handles `SiLU`, `GELU`, `GELUActivation`, `ReLU`, and anything else the backend tags `"activation"` — without enumerating names anywhere. A more specific `register("relu", CustomReluNode)` would still win for that one class.

### Role-based renderers

For concepts whose class name varies per model family — attention, mixture-of-experts, normalization — key on the backend's fact-derived `role` instead. `registerRole(role, Component)` (on both `BlockRegistry` and `DetailRegistry`) resolves after `type`/`category` miss:

```ts
// presentation/blocks/register.ts
blockRegistry.registerRole("moe", MoeBlockNode); // every Mixtral/Qwen-MoE/DeepSeek MoE block

// presentation/details/register.ts
detailRegistry.registerRole("attention", AttentionDetail); // every family's attention block
detailRegistry.registerRole("moe", MoeDetail);
detailRegistry.registerRole("norm", NormalizationDetail);
```

These ship today. They read their facts from `node.params` (the curated, role-scoped config facts the backend attaches — `num_heads`, `num_key_value_heads`, `num_experts`, `hidden_act`, `eps`, …) with a `config_summary` fallback, and **omit any row whose fact is absent** — so a panel still renders for a model that exposes none of them. `NormalizationDetail` distinguishes LayerNorm from RMSNorm by facts (a learnable bias, and the traced `native_layer_norm` vs `pow/rsqrt` ops), never by the class-name string.

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
