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
  goToExpansion(path: ExpansionPath): void;
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

  // Expanding pushes into the view stack. The detail panel CLOSES — once
  // you're inside a block, that block's information is shown by the
  // canvas-level "Previous block" context card (see PreviousBlockNode),
  // not by the side panel. This avoids dragging stale parent metadata
  // forward as the user keeps zooming in.
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
  // and close the panel — the user's intent is "go back to that level",
  // not "show me details of whatever I landed on".
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

  // Jump directly to a specific expansion path — used by the "Previous block"
  // context card to navigate to the previous sibling's internals in one
  // click instead of forcing the user to collapse + re-expand.
  goToExpansion: (path) =>
    set({
      expansionPath: [...path],
      selectionPath: [],
      detailOpen: false,
      level: levelFromExpansion(path),
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
