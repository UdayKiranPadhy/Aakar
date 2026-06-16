import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTheme } from "./useTheme";
import { useArchStore } from "../store/archStore";

// tests/setup.ts stubs matchMedia with `matches: false`, so "system" resolves to
// light unless a test overrides the stub (see the last case).
describe("useTheme", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("resolves 'system' via matchMedia (light) and applies data-theme", () => {
    useArchStore.setState({ themePreference: "system" });
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("honours an explicit preference over the OS setting", () => {
    useArchStore.setState({ themePreference: "dark" });
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("toggle writes the opposite explicit preference", () => {
    useArchStore.setState({ themePreference: "light" });
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(useArchStore.getState().themePreference).toBe("dark");
    expect(result.current.theme).toBe("dark");
  });

  it("resolves 'system' to dark when the OS prefers dark", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    useArchStore.setState({ themePreference: "system" });
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    vi.unstubAllGlobals();
  });
});
