import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useArchStore } from "../store/archStore";

afterEach(() => {
  useArchStore.setState({ helpOpen: false });
  document.body.innerHTML = "";
});

describe("useKeyboardShortcuts", () => {
  it("toggles the help dialog on '?'", () => {
    renderHook(() => useKeyboardShortcuts());
    fireEvent.keyDown(document, { key: "?" });
    expect(useArchStore.getState().helpOpen).toBe(true);
    fireEvent.keyDown(document, { key: "?" });
    expect(useArchStore.getState().helpOpen).toBe(false);
  });

  it("ignores '?' typed into an input field", () => {
    renderHook(() => useKeyboardShortcuts());
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "?" });
    expect(useArchStore.getState().helpOpen).toBe(false);
  });

  it("closes the dialog on Escape when open", () => {
    useArchStore.setState({ helpOpen: true });
    renderHook(() => useKeyboardShortcuts());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(useArchStore.getState().helpOpen).toBe(false);
  });
});
