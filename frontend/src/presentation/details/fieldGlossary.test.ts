import { describe, expect, it } from "vitest";

import { fieldTip } from "./fieldGlossary";

describe("fieldTip", () => {
  it("resolves canonical field names", () => {
    expect(fieldTip("param_count")).toMatch(/parameters/i);
    expect(fieldTip("memory_bytes")).toMatch(/memory/i);
    expect(fieldTip("category")).toMatch(/namespace/i);
    expect(fieldTip("role")).toMatch(/semantic role/i);
  });

  it("resolves display aliases to the same text as the canonical name", () => {
    expect(fieldTip("path")).toBe(fieldTip("module_path"));
    expect(fieldTip("class")).toBe(fieldTip("module_class"));
    expect(fieldTip("weight")).toBe(fieldTip("weight_shape"));
    expect(fieldTip("dtype")).toBe(fieldTip("param_dtype"));
  });

  it("is case-insensitive for the lowercase fallback", () => {
    expect(fieldTip("In_Features")).toBe(fieldTip("in_features"));
  });

  it("returns undefined for unknown / future fields, so the row still renders", () => {
    expect(fieldTip("some_field_added_next_year")).toBeUndefined();
    expect(fieldTip(undefined)).toBeUndefined();
    expect(fieldTip("")).toBeUndefined();
  });
});
