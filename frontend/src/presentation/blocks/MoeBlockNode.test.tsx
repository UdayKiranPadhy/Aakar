import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MoeBlockNode } from "./MoeBlockNode";
import type { Node } from "../../domain/spec";

const moeNode: Node = {
  id: "model.layers.0.mlp",
  type: "mixtral_sparse_moe_block",
  label: "Mlp",
  module_class: "MixtralSparseMoeBlock",
  role: "moe",
  params: { num_experts: 8, num_experts_per_tok: 2 },
  param_count: 1_000_000,
};

describe("MoeBlockNode", () => {
  it("draws an expert grid with the top-k experts highlighted", () => {
    const { container } = render(<MoeBlockNode node={moeNode} level={3} selected={false} />);
    expect(container.querySelectorAll(".expert")).toHaveLength(8);
    expect(container.querySelectorAll(".expertActive")).toHaveLength(2);
    expect(screen.getByText("2 of 8 experts / token")).toBeInTheDocument();
  });

  it("degrades to a plain card (no grid) when the expert count is unknown", () => {
    const bare: Node = { ...moeNode, params: {} };
    const { container } = render(<MoeBlockNode node={bare} level={3} selected={false} />);
    expect(container.querySelectorAll(".expert")).toHaveLength(0);
    expect(screen.getByText("Mlp")).toBeInTheDocument(); // still renders the card
  });
});
