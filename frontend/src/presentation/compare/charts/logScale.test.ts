import { describe, expect, it } from "vitest";

import { defaultLogTicks, logPosition } from "./logScale";

describe("logPosition", () => {
  it("maps one decade up on a two-decade axis to ~0.5", () => {
    expect(logPosition(1e7, 1e6, 1e8)).toBeCloseTo(0.5, 5);
  });
  it("clamps below min and above max to 0 / 1", () => {
    expect(logPosition(1e3, 1e6, 1e9)).toBe(0);
    expect(logPosition(1e12, 1e6, 1e9)).toBe(1);
  });
  it("returns 0 for invalid inputs", () => {
    expect(logPosition(0, 1e6, 1e9)).toBe(0);
    expect(logPosition(1e7, 0, 1e9)).toBe(0);
    expect(logPosition(1e7, 1e9, 1e6)).toBe(0); // max <= min
  });
});

describe("defaultLogTicks", () => {
  it("returns inclusive power-of-ten ticks", () => {
    expect(defaultLogTicks(1e6, 1e9)).toEqual([1e6, 1e7, 1e8, 1e9]);
  });
  it("returns [] for invalid ranges", () => {
    expect(defaultLogTicks(0, 1e9)).toEqual([]);
    expect(defaultLogTicks(1e9, 1e6)).toEqual([]);
  });
});
