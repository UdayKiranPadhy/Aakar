import { describe, expect, it } from "vitest";

import { CATEGORICAL_COUNT, categoricalColor, SERIES_A, SERIES_B } from "./palette";

describe("palette", () => {
  it("exposes token-backed A/B series colours (dark-mode safe)", () => {
    expect(SERIES_A).toBe("var(--color-accent)");
    expect(SERIES_B).toBe("var(--g-green)");
  });
  it("returns var(--token) strings for categorical slices", () => {
    expect(categoricalColor(0)).toMatch(/^var\(--/);
  });
  it("cycles the palette and wraps", () => {
    expect(categoricalColor(CATEGORICAL_COUNT)).toBe(categoricalColor(0));
    expect(categoricalColor(CATEGORICAL_COUNT + 1)).toBe(categoricalColor(1));
  });
  it("guards negative / non-finite indices", () => {
    expect(categoricalColor(-1)).toBe(categoricalColor(0));
    expect(categoricalColor(Number.NaN)).toBe(categoricalColor(0));
  });
});
