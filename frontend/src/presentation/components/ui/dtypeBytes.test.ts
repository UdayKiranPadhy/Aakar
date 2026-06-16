import { describe, expect, it } from "vitest";

import { DTYPE_BYTES, bytesForDtype } from "./dtypeBytes";

describe("bytesForDtype", () => {
  it("returns the byte width for known dtypes", () => {
    expect(bytesForDtype("float32")).toBe(4);
    expect(bytesForDtype("bfloat16")).toBe(2);
    expect(bytesForDtype("float16")).toBe(2);
    expect(bytesForDtype("float64")).toBe(8);
    expect(bytesForDtype("int8")).toBe(1);
  });

  it("returns the fallback for unknown or missing dtypes", () => {
    expect(bytesForDtype("nf4", 4)).toBe(4);
    expect(bytesForDtype(undefined, 2)).toBe(2);
  });

  it("returns undefined when unknown/missing and no fallback is given", () => {
    expect(bytesForDtype("nf4")).toBeUndefined();
    expect(bytesForDtype(undefined)).toBeUndefined();
  });

  it("exposes the dtype map so callers can derive precision options", () => {
    expect(Object.keys(DTYPE_BYTES)).toContain("float32");
    expect(Object.keys(DTYPE_BYTES).length).toBeGreaterThan(0);
  });
});
