/**
 * Learn-view registry (Strategy pattern) — the Learn-page sibling of
 * `ModelViewRegistry` / `CompareViewRegistry`. Maps a `LearnView` key to the
 * React component shown in the Learn content area, plus the metadata (`label`,
 * `order`) the left `LearnSidebar` renders its nav from. Adding a Learn section
 * is one component file + one `register()` call in `register.tsx`.
 *
 * Learn views take no props: the whole surface is self-contained, statically
 * authored content (no backend, no model spec). Cross-section navigation — the
 * "View all →" links on the Overview, say — goes through the store
 * (`setLearnView`) directly, exactly as the rest of the app reads Zustand.
 */

import type { ComponentType } from "react";

import type { LearnView } from "../../domain/navigation";

export type LearnViewComponent = ComponentType;

export type LearnViewMeta = Readonly<{
  key: LearnView;
  /** Sidebar label. */
  label: string;
  /** Sort order in the sidebar (ascending). */
  order: number;
}>;

type Entry = Readonly<{ meta: LearnViewMeta; component: LearnViewComponent }>;

export class LearnViewRegistry {
  private readonly entries = new Map<LearnView, Entry>();

  register(meta: LearnViewMeta, component: LearnViewComponent): void {
    if (this.entries.has(meta.key)) {
      throw new Error(`LearnViewRegistry: '${meta.key}' already registered`);
    }
    this.entries.set(meta.key, { meta, component });
  }

  resolve(key: LearnView): LearnViewComponent | null {
    return this.entries.get(key)?.component ?? null;
  }

  /** Registered views, sorted by `order` — drives the sidebar nav. */
  list(): ReadonlyArray<LearnViewMeta> {
    return [...this.entries.values()].map((e) => e.meta).sort((a, b) => a.order - b.order);
  }
}

export const learnViewRegistry = new LearnViewRegistry();
