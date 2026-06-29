/**
 * Block-renderer registry (Strategy pattern).
 *
 * Resolution priority for a node:
 *   1. `register(type, ...)` — a renderer keyed on `snake_case(module_class)`.
 *   2. `registerCategory(category, ...)` — a renderer keyed on the backend's
 *      semantic `category` (e.g. `"activation"`), shared by many classes.
 *   3. `registerRole(role, ...)` — a renderer keyed on the backend's fact-derived
 *      `role` (e.g. `"moe"`). This is the family-agnostic key for concepts whose
 *      class name varies per model (`mixtral_sparse_moe_block`, … ) — the backend
 *      only sets `role` when a rule proves it, so a role match is "guaranteed true".
 *   4. Fallback (`GenericBlockNode`).
 *
 * Adding a custom renderer is one new component + one `register*()` call in
 * `register.ts`. See docs/block-types.md.
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
  private readonly categoryRegistry = new Map<string, BlockNodeComponent>();
  private readonly roleRegistry = new Map<string, BlockNodeComponent>();

  constructor(private readonly fallback: BlockNodeComponent) {}

  register(type: string, component: BlockNodeComponent): void {
    if (this.registry.has(type)) {
      throw new Error(`BlockRegistry: '${type}' already registered`);
    }
    this.registry.set(type, component);
  }

  registerCategory(category: string, component: BlockNodeComponent): void {
    if (this.categoryRegistry.has(category)) {
      throw new Error(`BlockRegistry: category '${category}' already registered`);
    }
    this.categoryRegistry.set(category, component);
  }

  registerRole(role: string, component: BlockNodeComponent): void {
    if (this.roleRegistry.has(role)) {
      throw new Error(`BlockRegistry: role '${role}' already registered`);
    }
    this.roleRegistry.set(role, component);
  }

  resolve(node: Pick<Node, "type" | "category" | "role">): BlockNodeComponent {
    const byType = this.registry.get(node.type);
    if (byType) return byType;
    if (node.category) {
      const byCategory = this.categoryRegistry.get(node.category);
      if (byCategory) return byCategory;
    }
    if (node.role) {
      const byRole = this.roleRegistry.get(node.role);
      if (byRole) return byRole;
    }
    return this.fallback;
  }

  /** Inspection helper for tests / debug panels. */
  get registeredTypes(): readonly string[] {
    return Array.from(this.registry.keys());
  }

  get registeredCategories(): readonly string[] {
    return Array.from(this.categoryRegistry.keys());
  }

  get registeredRoles(): readonly string[] {
    return Array.from(this.roleRegistry.keys());
  }
}

export const blockRegistry = new BlockRegistry(GenericBlockNode);
