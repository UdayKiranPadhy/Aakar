import { describe, expect, it } from "vitest";

import type { Node } from "../../../domain/spec";
import {
  collectLeafTensors,
  reconcileParamTotal,
  scaleFlops,
  sumFlops,
  topLevelComponents,
} from "./breakdown";

function node(partial: Partial<Node> & { id: string }): Node {
  return { type: "x", label: partial.id, params: {}, ...partial } as Node;
}

describe("topLevelComponents", () => {
  it("expands the dominant backbone one level", () => {
    const graph = [
      node({
        id: "root",
        param_count: 100,
        children: [
          node({
            id: "model",
            param_count: 90,
            children: [node({ id: "embed", param_count: 30 }), node({ id: "layers", param_count: 60 })],
          }),
          node({ id: "lm_head", param_count: 10 }),
        ],
      }),
    ];
    expect(topLevelComponents(graph).map((c) => c.id)).toEqual(["embed", "layers", "lm_head"]);
  });

  it("keeps top-level children when none dominate", () => {
    const graph = [
      node({
        id: "root",
        param_count: 100,
        children: [
          node({ id: "a", param_count: 30, children: [node({ id: "a1", param_count: 30 })] }),
          node({ id: "b", param_count: 30, children: [node({ id: "b1", param_count: 30 })] }),
          node({ id: "c", param_count: 40, children: [node({ id: "c1", param_count: 40 })] }),
        ],
      }),
    ];
    expect(topLevelComponents(graph).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("sumFlops", () => {
  it("recursively sums node flops", () => {
    const n = node({
      id: "x",
      flops: 10,
      children: [node({ id: "y", flops: 5 }), node({ id: "z", children: [node({ id: "w", flops: 7 })] })],
    });
    expect(sumFlops(n)).toBe(22);
  });
});

describe("collectLeafTensors", () => {
  it("returns only leaves with a weight shape", () => {
    const graph = [
      node({
        id: "root",
        children: [
          node({ id: "lin", weight_shape: [4, 4], param_count: 16 }),
          node({ id: "act" }),
          node({ id: "block", children: [node({ id: "inner", weight_shape: [2, 2], param_count: 4 })] }),
        ],
      }),
    ];
    expect(collectLeafTensors(graph).map((n) => n.id)).toEqual(["lin", "inner"]);
  });
});

describe("reconcileParamTotal", () => {
  it("prefers the safetensors total", () => {
    expect(reconcileParamTotal(100, 124_000_000)).toEqual({ total: 124_000_000, source: "safetensors" });
  });
  it("falls back to introspected when safetensors is missing", () => {
    expect(reconcileParamTotal(100, undefined)).toEqual({ total: 100, source: "introspected" });
  });
});

describe("scaleFlops", () => {
  it("scales linearly with token count", () => {
    expect(scaleFlops(1000, { batch_size: 1, seq_len: 2048 }, { batch: 2, seq: 2048 })).toBe(2000);
    expect(scaleFlops(1000, { batch_size: 1, seq_len: 2048 }, { batch: 1, seq: 1024 })).toBe(500);
  });
});
