import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useScrollDirection } from "./useScrollDirection";

/**
 * Creates a fake scrollable element backed by a writable scrollTop. We dispatch
 * a "scroll" event after each mutation so the listener inside the hook fires
 * the same way it would in a real browser.
 */
function makeScrollable(): HTMLElement {
  const el = document.createElement("div");
  let scrollTop = 0;
  Object.defineProperty(el, "scrollTop", {
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v;
    },
  });
  return el;
}

function scroll(el: HTMLElement, y: number): void {
  el.scrollTop = y;
  el.dispatchEvent(new Event("scroll"));
}

describe("useScrollDirection", () => {
  it("returns false initially", () => {
    const el = makeScrollable();
    const { result } = renderHook(() => useScrollDirection(el));
    expect(result.current).toBe(false);
  });

  it("returns false when the element is null (e.g. on Visualizer view)", () => {
    const { result } = renderHook(() => useScrollDirection(null));
    expect(result.current).toBe(false);
  });

  it("stays false while scroll is below the COLLAPSE_THRESHOLD (80 px)", () => {
    const el = makeScrollable();
    const { result } = renderHook(() => useScrollDirection(el));
    act(() => scroll(el, 50));
    expect(result.current).toBe(false);
  });

  it("collapses (returns true) on scroll down past the threshold", () => {
    const el = makeScrollable();
    const { result } = renderHook(() => useScrollDirection(el));
    act(() => scroll(el, 300));
    expect(result.current).toBe(true);
  });

  it("uncollapses on scroll up past the delta threshold", () => {
    const el = makeScrollable();
    const { result } = renderHook(() => useScrollDirection(el));
    act(() => scroll(el, 300));
    expect(result.current).toBe(true);
    act(() => scroll(el, 100)); // delta -200, well over 4 px threshold
    expect(result.current).toBe(false);
  });

  it("returns to uncollapsed when scrolled back near the top regardless of direction", () => {
    const el = makeScrollable();
    const { result } = renderHook(() => useScrollDirection(el));
    act(() => scroll(el, 500));
    act(() => scroll(el, 40)); // below threshold → reset
    expect(result.current).toBe(false);
  });

  it("ignores sub-DELTA_THRESHOLD jitter (1-2 px scrolls don't toggle state)", () => {
    const el = makeScrollable();
    const { result } = renderHook(() => useScrollDirection(el));
    act(() => scroll(el, 200)); // collapse
    act(() => scroll(el, 198)); // delta -2, below threshold
    expect(result.current).toBe(true); // still collapsed
  });

  it("re-attaches the listener when the element reference changes", () => {
    const a = makeScrollable();
    const b = makeScrollable();
    const { result, rerender } = renderHook(
      ({ el }: { el: HTMLElement | null }) => useScrollDirection(el),
      { initialProps: { el: a } },
    );
    act(() => scroll(a, 300));
    expect(result.current).toBe(true);

    // Swap to a new element: state resets, old element's scroll no longer counts.
    rerender({ el: b });
    expect(result.current).toBe(false);
    act(() => scroll(a, 500)); // a is detached now
    expect(result.current).toBe(false);
    act(() => scroll(b, 300)); // b is the new listener
    expect(result.current).toBe(true);
  });
});
