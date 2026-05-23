import { describe, expect, it } from "vitest";

import { formatBytes, formatFlops, formatParamCount, formatShape } from "./format";

describe("formatParamCount", () => {
  it("returns '0' for zero (special-cased to avoid '0.00B')", () => {
    expect(formatParamCount(0)).toBe("0");
  });

  it("formats sub-thousand counts as locale strings (commas)", () => {
    expect(formatParamCount(42)).toBe("42");
    expect(formatParamCount(999)).toBe("999");
  });

  it("formats thousands with one decimal + K suffix", () => {
    expect(formatParamCount(1_500)).toBe("1.5K");
    expect(formatParamCount(786_432)).toBe("786.4K");
  });

  it("formats millions with one decimal + M suffix", () => {
    expect(formatParamCount(7_087_872)).toBe("7.1M");
    expect(formatParamCount(38_597_376)).toBe("38.6M");
  });

  it("formats billions with two decimals + B suffix (model-scale precision)", () => {
    expect(formatParamCount(8_030_000_000)).toBe("8.03B");
    expect(formatParamCount(124_439_808)).toBe("124.4M");
  });
});

describe("formatShape", () => {
  it("returns null for empty/undefined", () => {
    expect(formatShape(undefined)).toBeNull();
    expect(formatShape([])).toBeNull();
  });

  it("joins 2D shapes with ' × '", () => {
    expect(formatShape([4096, 4096])).toBe("4096 × 4096");
    expect(formatShape([128256, 4096])).toBe("128256 × 4096");
  });

  it("returns a single dim unchanged for 1D shapes", () => {
    expect(formatShape([4096])).toBe("4096");
  });
});

describe("formatBytes", () => {
  it("returns null for undefined", () => {
    expect(formatBytes(undefined)).toBeNull();
  });

  it("renders zero with a B suffix", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("scales through KB / MB / GB / TB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2_000)).toBe("2.0 KB");
    expect(formatBytes(5_300_000)).toBe("5.3 MB");
    expect(formatBytes(16_000_000_000)).toBe("16.00 GB");
    expect(formatBytes(2_500_000_000_000)).toBe("2.50 TB");
  });
});

describe("formatFlops", () => {
  it("returns null for undefined", () => {
    expect(formatFlops(undefined)).toBeNull();
  });

  it("scales through KF / MF / GF / TF", () => {
    expect(formatFlops(800)).toBe("800 F");
    expect(formatFlops(15_000)).toBe("15.0 KF");
    expect(formatFlops(2_500_000)).toBe("2.5 MF");
    expect(formatFlops(8_000_000_000)).toBe("8.00 GF");
    expect(formatFlops(1_200_000_000_000)).toBe("1.20 TF");
  });
});
