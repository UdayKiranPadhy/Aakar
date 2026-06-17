import { describe, expect, it } from "vitest";

import type { Spec } from "../../../domain/spec";
import { type TokenFact, tokenRows } from "./tokensFacts";

function spec(p: Partial<Spec>): Spec {
  return { model_id: "x/m", model_type: "m", config_summary: {}, graph: [], ...p };
}
const find = (rows: ReadonlyArray<TokenFact>, label: string) => rows.find((r) => r.label === label);

describe("tokenRows", () => {
  it("includes only present fields", () => {
    const rows = tokenRows(spec({ config_summary: { vocab_size: 128256, max_position_embeddings: 8192 } }));
    expect(find(rows, "Vocabulary size")?.value).toBe("128,256");
    expect(find(rows, "Context window")?.value).toBe("8,192 tokens");
    expect(find(rows, "Sliding window")).toBeUndefined();
    expect(find(rows, "RoPE scaling")).toBeUndefined();
  });

  it("formats rope_scaling from config_full when present", () => {
    const rows = tokenRows(spec({ config_full: { rope_scaling: { rope_type: "yarn", factor: 8 } } }));
    expect(find(rows, "RoPE scaling")?.value).toBe("rope_type: yarn, factor: 8");
  });

  it("shows the experts row only for MoE models", () => {
    expect(
      find(tokenRows(spec({ config_summary: { num_local_experts: 8, num_experts_per_tok: 2 } })), "Experts")?.value,
    ).toBe("8 experts · top-2");
    expect(find(tokenRows(spec({ config_summary: {} })), "Experts")).toBeUndefined();
  });

  it("returns [] for a null spec", () => {
    expect(tokenRows(null)).toEqual([]);
  });
});
