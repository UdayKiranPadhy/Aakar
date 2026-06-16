import { describe, expect, it } from "vitest";

import { explainFlowNode, explainRole } from "./explanations";

const flow = (type: string, params: Record<string, string> = {}) =>
  ({ type, params }) as const;

describe("explainFlowNode", () => {
  it("explains every op category", () => {
    const categories = [
      "matmul",
      "activation",
      "norm",
      "elementwise",
      "embedding",
      "attention",
      "shape",
      "other",
    ];
    for (const category of categories) {
      const ex = explainFlowNode(flow("operation", { op: "", category }));
      expect(ex.title, category).toBeTruthy();
      expect(ex.what.length, category).toBeGreaterThan(10);
    }
  });

  it("prefers a specific op explanation over its category", () => {
    const softmax = explainFlowNode(flow("operation", { op: "_safe_softmax", category: "activation" }));
    expect(softmax.title).toBe("Softmax");
  });

  it("explains every hand-authored semantic glyph type", () => {
    const types = [
      "attention_heads",
      "attention_scores",
      "attention_softmax",
      "attention_mix",
      "mlp_multiply",
      "flow_residual",
      "flow_input",
    ];
    for (const type of types) {
      const ex = explainFlowNode(flow(type));
      expect(ex.title, type).toBeTruthy();
      expect(ex.what.length, type).toBeGreaterThan(10);
    }
  });

  it("falls back gracefully for unknown synthetic types", () => {
    expect(explainFlowNode(flow("mystery")).title).toBe("Operation");
  });
});

describe("explainRole", () => {
  it("glosses every documented module role", () => {
    const roles = [
      "attention",
      "mlp",
      "moe",
      "norm",
      "token_embedding",
      "position_embedding",
      "lm_head",
      "linear",
      "layer_stack",
    ];
    for (const role of roles) {
      const ex = explainRole(role);
      expect(ex, role).not.toBeNull();
      expect(ex!.what.length, role).toBeGreaterThan(10);
    }
  });

  it("returns null for an unknown or absent role", () => {
    expect(explainRole("something_new")).toBeNull();
    expect(explainRole(undefined)).toBeNull();
  });
});
