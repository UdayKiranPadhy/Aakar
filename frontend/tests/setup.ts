/**
 * Global test setup — extends Vitest's `expect` with jest-dom matchers and
 * resets the React testing library + the Zustand store between tests so each
 * test starts from a clean state.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { useArchStore } from "../src/store/archStore";

// jsdom implements neither IntersectionObserver nor matchMedia. framer-motion's
// `whileInView` / `useReducedMotion` rely on them, so stub both. The observer
// stub never fires (elements stay in their initial state) — fine for assertions
// on rendered text/structure, which exist in the DOM regardless of animation.
if (!("IntersectionObserver" in globalThis)) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", IO);
}
if (!window.matchMedia) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}
// jsdom doesn't implement SVG geometry; framer-motion measures path length for
// its `pathLength` (line-draw) animations. Provide a stub so it doesn't throw.
if (typeof SVGElement !== "undefined") {
  const proto = SVGElement.prototype as unknown as { getTotalLength?: () => number };
  if (!proto.getTotalLength) proto.getTotalLength = () => 100;
}

const initialState = useArchStore.getState();

beforeEach(() => {
  // Reset Zustand store to fresh state before each test. Without this, store
  // mutations leak across tests and assertions become order-dependent.
  useArchStore.setState({
    ...initialState,
    spec: null,
    selectionPath: [],
    expansionPath: [],
    level: 1,
    detailOpen: false,
    loading: false,
    error: null,
    modelInput: "",
    view: "home",
  });
});

afterEach(() => {
  cleanup();
});
