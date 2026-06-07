/**
 * Zustand store — the application's state container.
 *
 * Holds state and exposes thin setters. Business logic (fetching, deriving
 * the selected node, deciding when to reset) lives in the `application/*`
 * hooks, not here. Keeping the store dumb makes it trivial to swap or mock.
 *
 * Navigation has two orthogonal axes:
 *   - `appMode`   — the second-row tabs (home / model / compare / learn)
 *   - `modelView` — within a loaded model, which sidebar view is active
 */

import { create } from "zustand";

import type { LoadError } from "../application/loadError";
import {
  type AppMode,
  type ExpansionPath,
  type Level,
  type ModelView,
  type SelectionPath,
  levelFromExpansion,
} from "../domain/navigation";
import type { Spec } from "../domain/spec";

// Optional HF read token for gated models. Persisted to localStorage only when
// the user opts in ("remember"); otherwise it lives in memory for the session.
// Guarded so private-mode / disabled storage never throws.
const HF_TOKEN_KEY = "aakar.hfToken";
function readStoredToken(): string | null {
  try {
    return localStorage.getItem(HF_TOKEN_KEY);
  } catch {
    return null;
  }
}
function persistToken(token: string | null, remember: boolean): void {
  try {
    if (remember && token) localStorage.setItem(HF_TOKEN_KEY, token);
    else localStorage.removeItem(HF_TOKEN_KEY);
  } catch {
    /* storage unavailable — keep the in-memory value only */
  }
}

type State = {
  modelInput: string;
  spec: Spec | null;
  /** Second model for the Compare view; null otherwise. */
  compareSpec: Spec | null;
  loading: boolean;
  error: LoadError | null;
  selectionPath: SelectionPath;
  expansionPath: ExpansionPath;
  level: Level;
  detailOpen: boolean;
  appMode: AppMode;
  modelView: ModelView;
  sidebarCollapsed: boolean;
  /** Pixel widths of the resizable left/right rails (ignored while collapsed). */
  sidebarWidth: number;
  detailWidth: number;
  /** Right detail panel collapsed to a thin rail (distinct from closed). */
  detailCollapsed: boolean;
  /** Optional HF read token for gated repos; null when none provided. */
  hfToken: string | null;
};

type Actions = {
  setModelInput(value: string): void;
  setSpec(spec: Spec): void;
  setCompareSpec(spec: Spec | null): void;
  setLoading(loading: boolean): void;
  setError(error: LoadError | null): void;
  selectNode(id: string): void;
  expandNode(id: string): void;
  collapseToLevel(target: Level): void;
  goToExpansion(path: ExpansionPath): void;
  closeDetail(): void;
  setAppMode(mode: AppMode): void;
  setModelView(view: ModelView): void;
  toggleSidebar(collapsed?: boolean): void;
  setSidebarWidth(width: number): void;
  setDetailWidth(width: number): void;
  toggleDetail(collapsed?: boolean): void;
  /** Set/clear the HF token; `remember` persists it to localStorage. */
  setHfToken(token: string | null, remember: boolean): void;
  reset(): void;
};

const initialState: State = {
  modelInput: "",
  spec: null,
  compareSpec: null,
  loading: false,
  error: null,
  selectionPath: [],
  expansionPath: [],
  level: 1,
  detailOpen: false,
  appMode: "home",
  modelView: "overview",
  sidebarCollapsed: false,
  sidebarWidth: 248,
  detailWidth: 320,
  detailCollapsed: false,
  hfToken: readStoredToken(),
};

export const useArchStore = create<State & Actions>()((set) => ({
  ...initialState,

  setModelInput: (value) => set({ modelInput: value }),

  setSpec: (spec) => set({ spec, error: null, loading: false }),

  setCompareSpec: (compareSpec) => set({ compareSpec }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  // Selection lives at the current view's depth: prepend the expansionPath so
  // the selectionPath is a full root-to-node path through the tree.
  selectNode: (id) =>
    set((s) => ({
      selectionPath: [...s.expansionPath, id],
      detailOpen: true,
      // Picking a node always reveals its panel, even if the rail was collapsed.
      detailCollapsed: false,
    })),

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
  // context card and the sidebar module-tree outline to navigate in one click.
  goToExpansion: (path) =>
    set({
      expansionPath: [...path],
      selectionPath: [],
      detailOpen: false,
      level: levelFromExpansion(path),
    }),

  closeDetail: () => set({ detailOpen: false }),

  setAppMode: (appMode) => set({ appMode }),

  setModelView: (modelView) => set({ modelView }),

  toggleSidebar: (collapsed) =>
    set((s) => ({ sidebarCollapsed: collapsed ?? !s.sidebarCollapsed })),

  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),

  setDetailWidth: (detailWidth) => set({ detailWidth }),

  toggleDetail: (collapsed) =>
    set((s) => ({ detailCollapsed: collapsed ?? !s.detailCollapsed })),

  setHfToken: (token, remember) => {
    persistToken(token, remember);
    set({ hfToken: token });
  },

  reset: () =>
    set((s) => ({
      ...initialState,
      modelInput: s.modelInput,
      appMode: s.appMode,
      sidebarWidth: s.sidebarWidth,
      detailWidth: s.detailWidth,
      hfToken: s.hfToken,
    })),
}));
