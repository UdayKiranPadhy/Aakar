/**
 * Detail-panel registry (Strategy pattern).
 *
 * `node.type` → React component for the right-side detail panel.
 * v0.1 ships only `GenericDetailPanel`; adding a custom panel for a block
 * type is one new component + one `register()` call.
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

  constructor(private readonly fallback: DetailPanelComponent) {}

  register(type: string, component: DetailPanelComponent): void {
    if (this.registry.has(type)) {
      throw new Error(`DetailRegistry: '${type}' already registered`);
    }
    this.registry.set(type, component);
  }

  resolve(type: string): DetailPanelComponent {
    return this.registry.get(type) ?? this.fallback;
  }
}

export const detailRegistry = new DetailRegistry(GenericDetailPanel);
