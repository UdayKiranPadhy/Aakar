import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MoeDetail } from "./MoeDetail";
import { useArchStore } from "../../store/archStore";
import type { Node, Spec } from "../../domain/spec";

useArchStore.setState({ spec: { config_summary: {} } as unknown as Spec });

const moeNode: Node = {
  id: "model.layers.0.mlp",
  type: "qwen2_moe_sparse_moe_block",
  label: "Mlp",
  module_class: "Qwen2MoeSparseMoeBlock",
  role: "moe",
  params: { num_experts: 8, num_experts_per_tok: 2, intermediate_size: 14336 },
};

describe("MoeDetail", () => {
  it("shows the routing facts with an active fraction", () => {
    render(<MoeDetail node={moeNode} />);
    expect(screen.getByText("Mixture of Experts")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument(); // experts
    expect(screen.getByText("2 · ~25%")).toBeInTheDocument(); // top-k + active %
    expect(screen.getByText("14,336")).toBeInTheDocument(); // expert width
  });

  it("omits the routing section but still teaches the concept when facts are absent", () => {
    const bare: Node = { ...moeNode, params: {} };
    render(<MoeDetail node={bare} />);
    expect(screen.getByText("Concept & Education")).toBeInTheDocument();
    expect(screen.queryByText("Routing")).toBeNull();
  });
});
