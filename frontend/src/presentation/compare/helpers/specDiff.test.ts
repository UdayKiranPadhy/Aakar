import { describe, expect, it } from "vitest";

import type { Spec } from "../../../domain/spec";
import { specDiffRows } from "./specDiff";

function spec(over: Partial<Spec>): Spec {
  return { model_id: "m", model_type: "llama", config_summary: {}, graph: [], ...over };
}

describe("specDiffRows", () => {
  it("marks a row as differing only when both sides differ", () => {
    const a = spec({ config_summary: { hidden_size: 4096, num_hidden_layers: 32 } });
    const b = spec({ config_summary: { hidden_size: 8192, num_hidden_layers: 32 } });
    const byLabel = Object.fromEntries(specDiffRows(a, b).map((r) => [r.label, r]));
    expect(byLabel["Hidden size"].differs).toBe(true);
    expect(byLabel["Layers"].differs).toBe(false);
  });

  it("renders an em-dash and never differs when one side is missing", () => {
    const a = spec({ config_summary: { hidden_size: 4096 } });
    const rows = specDiffRows(a, null);
    const hidden = rows.find((r) => r.label === "Hidden size");
    expect(hidden?.a).toBe("4,096");
    expect(hidden?.b).toBe("—");
    expect(rows.every((r) => !r.differs)).toBe(true);
  });

  it("produces no differences for identical specs", () => {
    const a = spec({ config_summary: { hidden_size: 4096 }, param_dtype: "bfloat16" });
    expect(specDiffRows(a, a).some((r) => r.differs)).toBe(false);
  });

  it("returns [] when both sides are null", () => {
    expect(specDiffRows(null, null)).toEqual([]);
  });
});
