import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AttentionDetail } from "./AttentionDetail";
import { useArchStore } from "../../store/archStore";
import type { Node, Spec } from "../../domain/spec";

function setSpec(partial: Partial<Spec>) {
  useArchStore.setState({ spec: { config_summary: {}, ...partial } as unknown as Spec });
}

const gqaNode: Node = {
  id: "model.layers.0.self_attn",
  type: "llama_attention",
  label: "Self attn",
  module_class: "LlamaAttention",
  module_path: "model.layers.0.self_attn",
  role: "attention",
  has_internals: true,
  params: { num_heads: 32, head_dim: 128, num_key_value_heads: 8, gqa_ratio: 4 },
  intermediates: {
    q: "[B, 32, S, 128]",
    k: "[B, 8, S, 128]",
    v: "[B, 8, S, 128]",
    attn_scores: "[B, 32, S, S]",
  },
  flops_detail: { attn_scores: 1000, attn_context: 1000 },
};

describe("AttentionDetail", () => {
  it("renders head facts, regime, GQA diagram and the SDPA compute breakdown", () => {
    setSpec({ attn_impl: "sdpa" });
    render(<AttentionDetail node={gqaNode} />);

    expect(screen.getByText("Self-Attention")).toBeInTheDocument();
    expect(screen.getByText(/Grouped-Query Attention/)).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument(); // query heads
    expect(screen.getByText("8")).toBeInTheDocument(); // kv heads
    expect(screen.getByText("4:1")).toBeInTheDocument(); // gqa ratio
    expect(screen.getByText(/sdpa/)).toBeInTheDocument(); // implementation
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/grouped/i);
    // Tensor path + compute breakdown labels.
    expect(screen.getByText("attn_scores")).toBeInTheDocument();
    expect(screen.getByText("Q·Kᵀ scores")).toBeInTheDocument();
  });

  it("omits the GQA diagram and ratio for plain multi-head attention", () => {
    setSpec({ attn_impl: "eager" });
    const mha: Node = {
      ...gqaNode,
      params: { num_heads: 12, head_dim: 64 },
      intermediates: undefined,
      flops_detail: undefined,
    };
    render(<AttentionDetail node={mha} />);
    expect(screen.getByText("Self-Attention")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull(); // no grouping diagram
    expect(screen.queryByText(/:1/)).toBeNull(); // no GQA ratio row
  });

  it("still renders (concept only) when no head facts are present", () => {
    setSpec({});
    const bare: Node = {
      id: "attn",
      type: "some_attention",
      label: "Attn",
      role: "attention",
      params: {},
    };
    render(<AttentionDetail node={bare} />);
    expect(screen.getByText("Concept & Education")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
