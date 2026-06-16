import { describe, expect, it } from "vitest";

import type { Spec } from "../../../domain/spec";
import { configDiff } from "./configDiff";

function spec(configFull: Record<string, unknown>): Spec {
  return { model_id: "m", model_type: "llama", config_summary: {}, config_full: configFull, graph: [] };
}

describe("configDiff", () => {
  it("classifies same / changed / added / removed", () => {
    const a = spec({ hidden_size: 4096, num_layers: 32, only_a: true });
    const b = spec({ hidden_size: 8192, num_layers: 32, only_b: "x" });
    const byPath = Object.fromEntries(configDiff(a, b).map((r) => [r.path, r]));
    expect(byPath["hidden_size"].status).toBe("changed");
    expect(byPath["num_layers"].status).toBe("same");
    expect(byPath["only_a"].status).toBe("removed");
    expect(byPath["only_b"].status).toBe("added");
  });

  it("flattens nested objects into dotted paths", () => {
    const a = spec({ rope_scaling: { factor: 8, type: "linear" } });
    const b = spec({ rope_scaling: { factor: 4, type: "linear" } });
    const byPath = Object.fromEntries(configDiff(a, b).map((r) => [r.path, r]));
    expect(byPath["rope_scaling.factor"].status).toBe("changed");
    expect(byPath["rope_scaling.type"].status).toBe("same");
  });

  it("returns the sorted union of paths", () => {
    const paths = configDiff(spec({ b_key: 1, a_key: 1 }), spec({ c_key: 1 })).map((r) => r.path);
    expect(paths).toEqual(["a_key", "b_key", "c_key"]);
  });

  it("treats every key as removed/added when the other side is null", () => {
    const a = spec({ hidden_size: 4096 });
    expect(configDiff(a, null).every((r) => r.status === "removed")).toBe(true);
    expect(configDiff(null, a).every((r) => r.status === "added")).toBe(true);
  });

  it("returns [] for two empty configs", () => {
    expect(configDiff(spec({}), spec({}))).toEqual([]);
  });

  it("falls back to config_summary when config_full is absent", () => {
    const a: Spec = { model_id: "m", model_type: "llama", config_summary: { hidden_size: 4096 }, graph: [] };
    const b: Spec = { model_id: "m", model_type: "llama", config_summary: { hidden_size: 8192 }, graph: [] };
    const byPath = Object.fromEntries(configDiff(a, b).map((r) => [r.path, r]));
    expect(byPath["hidden_size"].status).toBe("changed");
  });
});
