import { describe, expect, it } from "vitest";

import type { Spec } from "../../../domain/spec";
import { type KeyDifference, keyDifferences } from "./keyDifferences";

function spec(p: Partial<Spec>): Spec {
  return { model_id: "x/m", model_type: "m", config_summary: {}, graph: [], ...p };
}
const find = (diffs: ReadonlyArray<KeyDifference>, label: string) => diffs.find((d) => d.label === label);

describe("keyDifferences", () => {
  it("returns [] when a model is missing", () => {
    expect(keyDifferences(null, spec({}))).toEqual([]);
    expect(keyDifferences(spec({}), null)).toEqual([]);
  });

  it("reports the parameter ratio in the correct direction", () => {
    const a = spec({ model_id: "org/Big", config_summary: { total_params: 70_000_000_000 } });
    const b = spec({ model_id: "org/Small", config_summary: { total_params: 28_000_000_000 } });
    const d = find(keyDifferences(a, b), "Parameters");
    expect(d?.text).toContain("Big");
    expect(d?.text).toContain("2.5×");
  });

  it("emits no bullet when a field is equal", () => {
    const a = spec({ config_summary: { num_hidden_layers: 32 } });
    const b = spec({ config_summary: { num_hidden_layers: 32 } });
    expect(find(keyDifferences(a, b), "Depth")).toBeUndefined();
  });

  it("detects MoE vs dense when only one side declares experts", () => {
    const a = spec({ model_id: "org/Moe", config_summary: { num_local_experts: 8, num_experts_per_tok: 2 } });
    const b = spec({ model_id: "org/Dense", config_summary: {} });
    const d = find(keyDifferences(a, b), "Architecture");
    expect(d?.text).toContain("mixture-of-experts");
    expect(d?.text).toContain("Moe");
  });
});
