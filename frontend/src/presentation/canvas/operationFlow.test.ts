import { describe, expect, it } from "vitest";

import { buildOperationFlow, isOpFlowNode } from "./operationFlow";
import type { Node, Operation } from "../../domain/spec";

const op = (
  id: string,
  name: string,
  category: string,
  inputs: string[],
  out_shape?: string,
): Operation => ({ id, op: name, label: name, category, inputs, out_shape });

// A small but representative trace: a matmul source feeds a reshape (pure shape),
// the reshape feeds a softmax, and a final multiply consumes both the softmax and
// the original matmul — i.e. a diamond with one shape op on a branch.
const moduleWith = (operations: Operation[]): Node => ({
  id: "m",
  type: "attention",
  label: "Attn",
  params: {},
  operations,
});

const sample = moduleWith([
  op("mm_1", "mm", "matmul", [], "[B, S, S]"),
  op("view_1", "view", "shape", ["mm_1"], "[B, H, S, S]"),
  op("softmax_1", "_safe_softmax", "activation", ["view_1"], "[B, H, S, S]"),
  op("mul_1", "mul", "elementwise", ["softmax_1", "mm_1"], "[B, S, S]"),
]);

describe("buildOperationFlow", () => {
  it("returns null when the module has no operations", () => {
    expect(buildOperationFlow(moduleWith([]), { hideShapeOps: true })).toBeNull();
    expect(
      buildOperationFlow({ id: "m", type: "x", label: "X", params: {} }, { hideShapeOps: true }),
    ).toBeNull();
  });

  it("builds one op node and prefixed ids, with edges from inputs", () => {
    const flow = buildOperationFlow(sample, { hideShapeOps: false })!;

    expect(flow.nodes).toHaveLength(4);
    expect(flow.nodes.every(isOpFlowNode)).toBe(true);
    expect(flow.nodes.find((n) => n.id === "__op__m.softmax_1")?.label).toBe("_safe_softmax");
    expect(flow.nodes.find((n) => n.id === "__op__m.softmax_1")?.meta).toBe("[B, H, S, S]");

    const edges = flow.edges.map((e) => `${e.source}→${e.target}`);
    expect(edges).toContain("__op__m.mm_1→__op__m.view_1");
    expect(edges).toContain("__op__m.view_1→__op__m.softmax_1");
    expect(edges).toContain("__op__m.softmax_1→__op__m.mul_1");
    expect(edges).toContain("__op__m.mm_1→__op__m.mul_1");
  });

  it("hides shape ops and bridges edges transitively across them", () => {
    const flow = buildOperationFlow(sample, { hideShapeOps: true })!;

    // view_1 (category "shape") is dropped...
    expect(flow.nodes.map((n) => n.id)).not.toContain("__op__m.view_1");
    expect(flow.nodes).toHaveLength(3);

    // ...and the mm_1 → view_1 → softmax_1 path collapses to a direct mm_1 → softmax_1 edge.
    const edges = flow.edges.map((e) => `${e.source}→${e.target}`);
    expect(edges).toContain("__op__m.mm_1→__op__m.softmax_1");
    expect(edges).not.toContain("__op__m.view_1→__op__m.softmax_1");
  });

  it("lays out ops left-to-right by longest-path depth", () => {
    const flow = buildOperationFlow(sample, { hideShapeOps: true })!;
    const x = (id: string) => flow.positions.find((p) => p.id === id)!.x;

    // mm_1 is a source (col 0); softmax_1 one past it; mul_1 one past softmax_1.
    expect(x("__op__m.mm_1")).toBeLessThan(x("__op__m.softmax_1"));
    expect(x("__op__m.softmax_1")).toBeLessThan(x("__op__m.mul_1"));
  });

  it("colours op glyphs by category tone", () => {
    const flow = buildOperationFlow(sample, { hideShapeOps: false })!;
    expect(flow.tones.get("__op__m.mm_1")).toBe("matrix");
    expect(flow.tones.get("__op__m.softmax_1")).toBe("attention");
    expect(flow.tones.get("__op__m.mul_1")).toBe("residual");
  });

  it("treats inputs from outside the module as sources (no dangling edges)", () => {
    const flow = buildOperationFlow(
      moduleWith([op("mm_1", "mm", "matmul", ["embedding_7"], "[B, S, H]")]),
      { hideShapeOps: false },
    )!;
    // `embedding_7` belongs to another module → no edge, mm_1 sits at column 0.
    expect(flow.edges).toHaveLength(0);
    expect(flow.positions[0]).toMatchObject({ id: "__op__m.mm_1", x: 0 });
  });
});
