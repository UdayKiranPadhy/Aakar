import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useHideOnScroll } from "./useHideOnScroll";

// jsdom doesn't track scrollTop from layout, so back it with a closure variable.
function makeScroller() {
  const el = document.createElement("div");
  let top = 0;
  Object.defineProperty(el, "scrollTop", { get: () => top, configurable: true });
  return {
    el,
    scrollTo(y: number) {
      top = y;
      act(() => {
        el.dispatchEvent(new Event("scroll"));
      });
    },
  };
}

describe("useHideOnScroll", () => {
  it("starts visible", () => {
    const { result } = renderHook(() => useHideOnScroll(makeScroller().el));
    expect(result.current).toBe(false);
  });

  it("returns false for a null element", () => {
    const { result } = renderHook(() => useHideOnScroll(null));
    expect(result.current).toBe(false);
  });

  it("hides when scrolling down past the threshold", () => {
    const { el, scrollTo } = makeScroller();
    const { result } = renderHook(() => useHideOnScroll(el));
    scrollTo(200);
    expect(result.current).toBe(true);
  });

  it("shows again when scrolling back up", () => {
    const { el, scrollTo } = makeScroller();
    const { result } = renderHook(() => useHideOnScroll(el));
    scrollTo(200);
    scrollTo(150);
    expect(result.current).toBe(false);
  });

  it("stays visible near the top", () => {
    const { el, scrollTo } = makeScroller();
    const { result } = renderHook(() => useHideOnScroll(el));
    scrollTo(40);
    expect(result.current).toBe(false);
  });
});
