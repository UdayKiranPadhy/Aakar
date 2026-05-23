/**
 * Block-renderer registry (Strategy pattern).
 *
 * `node.type` → React component. v0.1 ships only `GenericBlockNode`; adding a
 * custom renderer for, say, `sparse_attention` is one new component + one
 * `register()` call in `register.ts`. See docs/block-types.md.
 */

import type { ComponentType } from "react";

import type { Level } from "../../domain/navigation";
import type { Node } from "../../domain/spec";
import { GenericBlockNode } from "./GenericBlockNode";

/**
 * Per-node role relative to the current selection. Drives the border colour
 * in the renderer:
 *   - "selected" → blue, current accent
 *   - "input"    → green; this node feeds the selected one
 *   - "output"   → amber; the selected one feeds this node
 *   - undefined  → default gray
 */
export type NodeRole = "input" | "output";
export type BlockVisualVariant = "layer-cell" | "flow-glyph";
export type BlockVisualTone =
  | "attention"
  | "embedding"
  | "io"
  | "matrix"
  | "mlp"
  | "norm"
  | "residual";

export type BlockNodeProps = {
  node: Node;
  level: Level;
  selected: boolean;
  role?: NodeRole;
  visualVariant?: BlockVisualVariant;
  visualTone?: BlockVisualTone;
  onSelect?: (id: string) => void;
  onExpand?: (id: string) => void;
};

export type BlockNodeComponent = ComponentType<BlockNodeProps>;

export class BlockRegistry {
  private readonly registry = new Map<string, BlockNodeComponent>();

  constructor(private readonly fallback: BlockNodeComponent) {}

  register(type: string, component: BlockNodeComponent): void {
    if (this.registry.has(type)) {
      throw new Error(`BlockRegistry: '${type}' already registered`);
    }
    this.registry.set(type, component);
  }

  resolve(type: string): BlockNodeComponent {
    return this.registry.get(type) ?? this.fallback;
  }

  /** Inspection helper for tests / debug panels. */
  get registeredTypes(): readonly string[] {
    return Array.from(this.registry.keys());
  }
}

export const blockRegistry = new BlockRegistry(GenericBlockNode);
