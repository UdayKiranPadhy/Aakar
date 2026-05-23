/**
 * Zustand store — the application's state container.
 *
 * Holds state and exposes thin setters. Business logic (fetching, deriving
 * the selected node, deciding when to reset) lives in the `application/*`
 * hooks, not here. Keeping the store dumb makes it trivial to swap or mock.
 */

import { create } from "zustand";

import {
  type ExpansionPath,
  type Level,
  type SelectionPath,
  levelFromExpansion,
} from "../domain/navigation";
import type { Spec } from "../domain/spec";

// Top-level page the user is currently viewing. Drives whether the main area
// shows the static HomeView or the architecture Canvas. Loading a model auto-
// switches to "visualizer"; clicking the Home tab switches back without
// discarding the loaded spec.
export type View = "home" | "visualizer";

type State = {
  modelInput: string;
  spec: Spec | null;
  loading: boolean;
  error: string | null;
  selectionPath: SelectionPath;
  expansionPath: ExpansionPath;
  level: Level;
  detailOpen: boolean;
  view: View;
};

type Actions = {
  setModelInput(value: string): void;
  setSpec(spec: Spec): void;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
  selectNode(id: string): void;
  expandNode(id: string): void;
  collapseToLevel(target: Level): void;
  closeDetail(): void;
  setView(view: View): void;
  reset(): void;
};

const initialState: State = {
  modelInput: "",
  spec: null,
  loading: false,
  error: null,
  selectionPath: [],
  expansionPath: [],
  level: 1,
  detailOpen: false,
  view: "home",
};

export const useArchStore = create<State & Actions>()((set) => ({
  ...initialState,

  setModelInput: (value) => set({ modelInput: value }),

  setSpec: (spec) => set({ spec, error: null, loading: false }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  // Selection lives at the current view's depth: prepend the expansionPath so
  // the selectionPath is a full root-to-node path through the tree.
  selectNode: (id) =>
    set((s) => ({
      selectionPath: [...s.expansionPath, id],
      detailOpen: true,
    })),

  // Expanding pushes into the view stack. Selection is cleared because the
  // selected node is now the parent of the new view (not in it).
  expandNode: (id) =>
    set((s) => {
      const next: ExpansionPath = [...s.expansionPath, id];
      return {
        expansionPath: next,
        selectionPath: [],
        detailOpen: false,
        level: levelFromExpansion(next),
      };
    }),

  // Truncate the expansionPath to `target - 1` entries. Clear selection
  // because what was selected may not exist at the new level.
  collapseToLevel: (target) =>
    set((s) => {
      const next: ExpansionPath = s.expansionPath.slice(0, target - 1);
      return {
        expansionPath: next,
        selectionPath: [],
        detailOpen: false,
        level: levelFromExpansion(next),
      };
    }),

  closeDetail: () => set({ detailOpen: false }),

  setView: (view) => set({ view }),

  // Used before fetching a new model; wipes navigation but keeps modelInput
  // and view (preserves the visualizer tab the user came from).
  reset: () =>
    set((s) => ({
      ...initialState,
      modelInput: s.modelInput,
      view: s.view,
    })),
}));
