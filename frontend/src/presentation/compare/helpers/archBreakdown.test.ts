import { describe, expect, it } from "vitest";

import type { Node, Spec } from "../../../domain/spec";
import { breakdownRows } from "./archBreakdown";

function node(over: Partial<Node>): Node {
  return { id: "n", type: "x", label: "n", params: {}, ...over };
}

function specOf(root: Node): Spec {
  return { model_id: "m", model_type: "llama", config_summary: {}, graph: [root] };
}

describe("breakdownRows", () => {
  it("computes each component's share of the total and passes metadata through", () => {
    const root = node({
      id: "root",
      label: "root",
      param_count: 100,
      children: [
        node({
          id: "embed",
          label: "Embedding",
          param_count: 25,
          module_class: "Embedding",
          role: "token_embedding",
          memory_bytes: 50,
        }),
        node({ id: "head", label: "LM head", param_count: 75, role: "lm_head" }),
      ],
    });
    const byId = Object.fromEntries(breakdownRows(specOf(root)).map((r) => [r.id, r]));
    expect(byId["embed"].pctOfTotal).toBeCloseTo(0.25);
    expect(byId["embed"].moduleClass).toBe("Embedding");
    expect(byId["embed"].role).toBe("token_embedding");
    expect(byId["embed"].memoryBytes).toBe(50);
    expect(byId["head"].pctOfTotal).toBeCloseTo(0.75);
  });

  it("guards against an unknown total (pct 0, no divide-by-zero)", () => {
    const root = node({ id: "root", param_count: 0, children: [node({ id: "c", label: "C", param_count: 50 })] });
    const rows = breakdownRows(specOf(root));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.pctOfTotal).toBe(0);
  });

  it("returns [] for a null spec", () => {
    expect(breakdownRows(null)).toEqual([]);
  });
});
