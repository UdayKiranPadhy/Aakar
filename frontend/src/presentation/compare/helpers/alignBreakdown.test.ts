import { describe, expect, it } from "vitest";

import type { Node, Spec } from "../../../domain/spec";
import { alignBreakdown } from "./alignBreakdown";

function node(p: Partial<Node>): Node {
  return { id: "n", type: "t", label: "n", params: {}, ...p };
}

// Mirrors a real decoder shape: root → backbone(dominant) + lm_head, where the
// backbone expands into embedding + layer_stack (per topLevelComponents).
const specA: Spec = {
  model_id: "org/A",
  model_type: "m",
  config_summary: {},
  graph: [
    node({
      id: "root",
      label: "Root",
      param_count: 1000,
      children: [
        node({
          id: "model",
          label: "Model",
          param_count: 900,
          children: [
            node({ id: "embed", label: "Embed", role: "token_embedding", param_count: 100 }),
            node({
              id: "layers",
              label: "Layers",
              role: "layer_stack",
              param_count: 800,
              children: [node({ id: "l0", label: "0" }), node({ id: "l1", label: "1" })],
            }),
          ],
        }),
        node({ id: "lm_head", label: "LM head", role: "lm_head", param_count: 100 }),
      ],
    }),
  ],
};

const specB: Spec = {
  model_id: "org/B",
  model_type: "m",
  config_summary: {},
  graph: [
    node({
      id: "root",
      label: "Root",
      param_count: 200,
      children: [node({ id: "embed", label: "Embed", role: "token_embedding", param_count: 200 })],
    }),
  ],
};

describe("alignBreakdown", () => {
  it("aligns components by role on a shared, ordered category set", () => {
    const rows = alignBreakdown(specA, specB);
    expect(rows.find((r) => r.label === "Embedding")).toMatchObject({ a: 100, b: 200 });
    const layers = rows.find((r) => r.label === "Decoder layers");
    expect(layers?.a).toBe(800);
    expect(layers?.b).toBeUndefined(); // B has no layer stack
    // Embedding sorts before Decoder layers before Output head.
    expect(rows.map((r) => r.label)).toEqual(["Embedding", "Decoder layers", "Output head"]);
  });

  it("returns [] when both specs are null", () => {
    expect(alignBreakdown(null, null)).toEqual([]);
  });
});
