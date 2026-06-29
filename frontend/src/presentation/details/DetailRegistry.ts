/**
 * Detail-panel registry (Strategy pattern).
 *
 * Resolution priority for a node:
 *   1. `register(type, ...)` — keyed on `snake_case(module_class)`.
 *   2. `registerRole(role, ...)` — keyed on the backend's fact-derived `role`
 *      (e.g. `"attention"`, `"moe"`, `"norm"`). This is the family-agnostic key
 *      for concepts whose class name varies per model; the backend only sets
 *      `role` when a rule proves it, so a role match is "guaranteed true".
 *   3. Fallback (`GenericDetailPanel`).
 *
 * Adding a custom panel is one new component + one `register*()` call.
 */

import type { ComponentType } from "react";

import type { Node } from "../../domain/spec";
import { GenericDetailPanel } from "./GenericDetailPanel";

export type DetailPanelProps = {
  node: Node;
  onExpand?: (id: string) => void;
  onClose?: () => void;
};

export type DetailPanelComponent = ComponentType<DetailPanelProps>;

export class DetailRegistry {
  private readonly registry = new Map<string, DetailPanelComponent>();
  private readonly roleRegistry = new Map<string, DetailPanelComponent>();

  constructor(private readonly fallback: DetailPanelComponent) {}

  register(type: string, component: DetailPanelComponent): void {
    if (this.registry.has(type)) {
      throw new Error(`DetailRegistry: '${type}' already registered`);
    }
    this.registry.set(type, component);
  }

  registerRole(role: string, component: DetailPanelComponent): void {
    if (this.roleRegistry.has(role)) {
      throw new Error(`DetailRegistry: role '${role}' already registered`);
    }
    this.roleRegistry.set(role, component);
  }

  /** Type-keyed lookup (kept for callers that only have a type string). */
  resolve(type: string): DetailPanelComponent {
    return this.registry.get(type) ?? this.fallback;
  }

  /** Full lookup: `type` wins, then the fact-derived `role`, then the fallback. */
  resolveNode(node: Pick<Node, "type" | "role">): DetailPanelComponent {
    const byType = this.registry.get(node.type);
    if (byType) return byType;
    if (node.role) {
      const byRole = this.roleRegistry.get(node.role);
      if (byRole) return byRole;
    }
    return this.fallback;
  }

  get registeredRoles(): readonly string[] {
    return Array.from(this.roleRegistry.keys());
  }
}

export const detailRegistry = new DetailRegistry(GenericDetailPanel);
