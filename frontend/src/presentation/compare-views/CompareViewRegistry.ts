/**
 * Compare-view registry (Strategy pattern) — the Compare-page sibling of
 * `ModelViewRegistry`. Maps a `CompareView` key to the React component shown in
 * the Compare content area, plus the metadata (`label`, `order`) the left
 * CompareSidebar renders its nav from. Adding a Compare tab is one component +
 * one `register()` call in `register.tsx`.
 *
 * Unlike `ModelViewProps`, both specs are nullable here: the Compare page is
 * meaningful with zero, one, or two models loaded, so a null is a valid state
 * each tab degrades around — not an error the host gates on.
 */

import type { ComponentType } from "react";

import type { CompareView } from "../../domain/navigation";
import type { Spec } from "../../domain/spec";
import type { CompareCalcContext } from "../compare/types";

export type CompareViewProps = Readonly<{
  a: Spec | null;
  b: Spec | null;
  /**
   * Calculator inputs + setters. The host supplies it to every tab, but it is
   * typed optional so tabs that ignore it (all but Compute) stay decoupled.
   */
  calc?: CompareCalcContext;
}>;

export type CompareViewComponent = ComponentType<CompareViewProps>;

export type CompareViewMeta = Readonly<{
  key: CompareView;
  label: string;
  /** Sort order in the sidebar (ascending). */
  order: number;
}>;

type Entry = Readonly<{ meta: CompareViewMeta; component: CompareViewComponent }>;

export class CompareViewRegistry {
  private readonly entries = new Map<CompareView, Entry>();

  register(meta: CompareViewMeta, component: CompareViewComponent): void {
    if (this.entries.has(meta.key)) {
      throw new Error(`CompareViewRegistry: '${meta.key}' already registered`);
    }
    this.entries.set(meta.key, { meta, component });
  }

  resolve(key: CompareView): CompareViewComponent | null {
    return this.entries.get(key)?.component ?? null;
  }

  /** Registered views, sorted by `order` — drives the sidebar nav. */
  list(): ReadonlyArray<CompareViewMeta> {
    return [...this.entries.values()].map((e) => e.meta).sort((a, b) => a.order - b.order);
  }
}

export const compareViewRegistry = new CompareViewRegistry();
