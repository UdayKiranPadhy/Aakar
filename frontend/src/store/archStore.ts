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
  type CompareSlot,
  type ExpansionPath,
  type Level,
  type ModelView,
  type SelectionPath,
  levelFromExpansion,
} from "../domain/navigation";
import type { Node, Spec } from "../domain/spec";
import type { ThemePreference } from "../domain/theme";

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

// Colour-theme preference. Persisted so a returning visitor keeps their choice;
// defaults to "system" (follow the OS) on a first visit. Same storage guard as
// the HF token. The boot script in index.html reads this same key to set the
// theme before first paint (avoiding a flash); the store and that script must
// stay in agreement on the key.
const THEME_KEY = "aakar.theme";
function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return "system";
}
function persistTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch {
    /* storage unavailable — keep the in-memory value only */
  }
}

type State = {
  modelInput: string;
  /**
   * Bumped to request that the nav's search field take focus — the channel for
   * the landing page's "Enter Model" CTA, which lives in a different subtree.
   * A monotonic counter rather than a boolean so repeated requests always fire.
   */
  searchFocusNonce: number;
  spec: Spec | null;
  /** The two models compared side by side in the Compare view; null when empty. */
  compareA: Spec | null;
  compareB: Spec | null;
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
  /**
   * When set, the canvas shows this module's forward-pass operation DAG instead
   * of the structure view. Holds the full root-to-module selection path.
   */
  opFlowPath: SelectionPath | null;
  /** Hide pure tensor-reshape ops (view/transpose/…) in the op-flow view. */
  opHideShapeOps: boolean;
  /**
   * A clicked synthetic node (op glyph or semantic glyph) — these aren't in the
   * Spec tree, so they can't be a `selectionPath`. When set, the detail panel
   * shows its explanation. Takes precedence over the path-based selection.
   */
  selectedFlowNode: Node | null;
  /** Colour-theme preference; "system" follows the OS. Resolved in useTheme. */
  themePreference: ThemePreference;
};

type Actions = {
  setModelInput(value: string): void;
  /** Request focus on the nav search field (landing "Enter Model" CTA). */
  requestSearchFocus(): void;
  setSpec(spec: Spec): void;
  setCompareSpec(slot: CompareSlot, spec: Spec | null): void;
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
  /** Focus the canvas on a module's forward-op DAG (full path to the module). */
  enterOpFlow(path: SelectionPath): void;
  /** Return the canvas to the structure view. */
  exitOpFlow(): void;
  setOpHideShapeOps(hide: boolean): void;
  /** Select a synthetic node (op/semantic glyph) to explain in the detail panel. */
  selectFlowNode(node: Node): void;
  /** Set the colour-theme preference; persists it to localStorage. */
  setThemePreference(preference: ThemePreference): void;
  reset(): void;
};

const initialState: State = {
  modelInput: "",
  searchFocusNonce: 0,
  spec: null,
  compareA: null,
  compareB: null,
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
  opFlowPath: null,
  opHideShapeOps: true,
  selectedFlowNode: null,
  themePreference: readStoredTheme(),
};

export const useArchStore = create<State & Actions>()((set) => ({
  ...initialState,

  setModelInput: (value) => set({ modelInput: value }),

  requestSearchFocus: () => set((s) => ({ searchFocusNonce: s.searchFocusNonce + 1 })),

  setSpec: (spec) => set({ spec, error: null, loading: false }),

  setCompareSpec: (slot, spec) =>
    set(slot === "a" ? { compareA: spec } : { compareB: spec }),

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
      // A real-module selection supersedes any clicked op/semantic glyph.
      selectedFlowNode: null,
    })),

  expandNode: (id) =>
    set((s) => {
      const next: ExpansionPath = [...s.expansionPath, id];
      return {
        expansionPath: next,
        selectionPath: [],
        detailOpen: false,
        level: levelFromExpansion(next),
        opFlowPath: null,
        selectedFlowNode: null,
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
        opFlowPath: null,
        selectedFlowNode: null,
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
      opFlowPath: null,
      selectedFlowNode: null,
    }),

  closeDetail: () => set({ detailOpen: false, selectedFlowNode: null }),

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

  enterOpFlow: (path) => set({ opFlowPath: [...path], selectedFlowNode: null }),

  exitOpFlow: () => set({ opFlowPath: null, selectedFlowNode: null }),

  setOpHideShapeOps: (opHideShapeOps) => set({ opHideShapeOps }),

  selectFlowNode: (node) =>
    set({ selectedFlowNode: node, detailOpen: true, detailCollapsed: false }),

  setThemePreference: (preference) => {
    persistTheme(preference);
    set({ themePreference: preference });
  },

  reset: () =>
    set((s) => ({
      ...initialState,
      modelInput: s.modelInput,
      appMode: s.appMode,
      // Compare is a standalone surface: loading a primary model must not wipe
      // an in-progress side-by-side comparison.
      compareA: s.compareA,
      compareB: s.compareB,
      sidebarWidth: s.sidebarWidth,
      detailWidth: s.detailWidth,
      hfToken: s.hfToken,
      themePreference: s.themePreference,
    })),
}));
