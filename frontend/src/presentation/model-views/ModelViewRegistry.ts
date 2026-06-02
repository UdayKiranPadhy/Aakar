/**
 * Model-view registry (Strategy pattern) — the fourth registry alongside
 * Block / Layout / Detail.
 *
 * `ModelView` key → React component shown in the dashboard content area, plus
 * the metadata (`label`, `order`) the left ModelSidebar renders its nav from.
 * Adding a new per-model view is one component + one `register()` call in
 * `register.tsx` (see docs/architecture.md).
 */

import type { ComponentType } from "react";

import type { ModelView } from "../../domain/navigation";
import type { Spec } from "../../domain/spec";

export type ModelViewProps = { spec: Spec };
export type ModelViewComponent = ComponentType<ModelViewProps>;

export type ModelViewMeta = Readonly<{
  key: ModelView;
  label: string;
  /** Sort order in the sidebar (ascending). */
  order: number;
}>;

type Entry = Readonly<{ meta: ModelViewMeta; component: ModelViewComponent }>;

export class ModelViewRegistry {
  private readonly entries = new Map<ModelView, Entry>();

  register(meta: ModelViewMeta, component: ModelViewComponent): void {
    if (this.entries.has(meta.key)) {
      throw new Error(`ModelViewRegistry: '${meta.key}' already registered`);
    }
    this.entries.set(meta.key, { meta, component });
  }

  resolve(key: ModelView): ModelViewComponent | null {
    return this.entries.get(key)?.component ?? null;
  }

  /** Registered views, sorted by `order` — drives the sidebar nav. */
  list(): ReadonlyArray<ModelViewMeta> {
    return [...this.entries.values()]
      .map((e) => e.meta)
      .sort((a, b) => a.order - b.order);
  }
}

export const modelViewRegistry = new ModelViewRegistry();
