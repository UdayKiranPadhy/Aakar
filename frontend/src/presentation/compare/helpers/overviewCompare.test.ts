import { describe, expect, it } from "vitest";

import type { ModelInfo } from "../../../domain/modelInfo";
import type { Spec } from "../../../domain/spec";
import { type CompareRow, quickCompareRows } from "./overviewCompare";

function spec(p: Partial<Spec>): Spec {
  return { model_id: "x/m", model_type: "m", config_summary: {}, graph: [], ...p };
}
const find = (rows: ReadonlyArray<CompareRow>, label: string) => rows.find((r) => r.label === label);

describe("quickCompareRows", () => {
  it("includes Model type from each spec and omits rows neither side has", () => {
    const rows = quickCompareRows(spec({ model_type: "llama" }), spec({ model_type: "qwen3" }), null, null);
    expect(find(rows, "Model type")).toMatchObject({ a: "llama", b: "qwen3" });
    expect(find(rows, "License")).toBeUndefined(); // no Hub info on either side
    expect(find(rows, "Multimodal")).toBeUndefined(); // not provable → omitted, never "No"
  });

  it("shows Multimodal only when provable (vision_config)", () => {
    const a = spec({ config_full: { vision_config: { hidden_size: 1 } } });
    expect(find(quickCompareRows(a, spec({}), null, null), "Multimodal")).toMatchObject({
      a: "Yes (Vision)",
      b: null,
    });
  });

  it("never asserts a value for the side that lacks it (em-dash via null)", () => {
    const a = spec({ config_summary: { max_position_embeddings: 128000 } });
    expect(find(quickCompareRows(a, spec({}), null, null), "Context length")).toMatchObject({
      a: "128,000",
      b: null,
    });
  });

  it("derives license + library from ModelInfo when present", () => {
    const info = {
      model_id: "x/m",
      tags: ["license:mit"],
      siblings: [],
      library_name: "transformers",
    } as ModelInfo;
    const rows = quickCompareRows(spec({}), spec({}), info, null);
    expect(find(rows, "License")).toMatchObject({ a: "MIT", b: null });
    expect(find(rows, "Library")).toMatchObject({ a: "transformers", b: null });
  });
});
