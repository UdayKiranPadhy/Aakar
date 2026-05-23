/**
 * Layout-strategy registry (Strategy pattern).
 *
 * Resolves a `LayoutStrategy` by the parent node's `type`. The strategy
 * computes (x, y) positions for each child node, which the canvas feeds to
 * React Flow.
 *
 * v0.1:
 *   - `verticalStack` is the fallback (used at level 1, level 2)
 *   - `fanOut` is registered for `self_attention` (used at level 3)
 *
 * Adding a new layout (e.g., MoE 8-expert fan-out) is one new strategy file
 * + one `register()` call.
 */

import type { Node } from "../../domain/spec";
import { verticalStack } from "./strategies/verticalStack";

export type LayoutPosition = { id: string; x: number; y: number };

export type LayoutStrategy = (
  children: ReadonlyArray<Node>,
) => ReadonlyArray<LayoutPosition>;

export class LayoutRegistry {
  private readonly registry = new Map<string, LayoutStrategy>();

  constructor(private readonly fallback: LayoutStrategy) {}

  register(parentType: string, strategy: LayoutStrategy): void {
    if (this.registry.has(parentType)) {
      throw new Error(`LayoutRegistry: '${parentType}' already registered`);
    }
    this.registry.set(parentType, strategy);
  }

  resolve(parentType: string): LayoutStrategy {
    return this.registry.get(parentType) ?? this.fallback;
  }

  get registeredTypes(): readonly string[] {
    return Array.from(this.registry.keys());
  }
}

export const layoutRegistry = new LayoutRegistry(verticalStack);
