/**
 * Global test setup — extends Vitest's `expect` with jest-dom matchers and
 * resets the React testing library + the Zustand store between tests so each
 * test starts from a clean state.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

import { useArchStore } from "../src/store/archStore";

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
