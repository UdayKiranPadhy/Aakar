import { describe, expect, it } from "vitest";

import {
  formatBytes,
  formatCompact,
  formatDate,
  formatFlops,
  formatParamCount,
  formatShape,
  pct,
} from "./format";

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

describe("formatCompact", () => {
  it("returns locale strings under 1000", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(999)).toBe("999");
  });
  it("scales through K / M / B, trimming a trailing .0", () => {
    expect(formatCompact(1_000)).toBe("1K");
    expect(formatCompact(1_500)).toBe("1.5K");
    expect(formatCompact(128_000)).toBe("128K");
    expect(formatCompact(5_595_879)).toBe("5.6M");
    expect(formatCompact(12_400_000)).toBe("12.4M");
    expect(formatCompact(2_300_000_000)).toBe("2.3B");
  });
});

describe("formatDate", () => {
  it("returns null for missing or unparseable input", () => {
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate("")).toBeNull();
    expect(formatDate("not-a-date")).toBeNull();
  });
  it("formats an ISO timestamp to a human month/day/year", () => {
    // Noon UTC keeps the month/year stable across any local timezone.
    const out = formatDate("2024-08-15T12:00:00Z");
    expect(out).toContain("Aug");
    expect(out).toContain("2024");
  });
});

describe("pct", () => {
  it("computes a trimmed percent of a total", () => {
    expect(pct(1, 4)).toBe("25%");
    expect(pct(1, 2)).toBe("50%");
    expect(pct(1, 3)).toBe("33.3%");
    expect(pct(2, 3)).toBe("66.7%");
  });
  it("guards a zero total", () => {
    expect(pct(0, 0)).toBe("0%");
  });
});
