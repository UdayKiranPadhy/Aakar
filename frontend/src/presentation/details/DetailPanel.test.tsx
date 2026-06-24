import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DetailPanel } from "./DetailPanel";
import { useArchStore } from "../../store/archStore";
import type { Spec } from "../../domain/spec";

const spec: Spec = {
  model_id: "gpt2",
  model_type: "gpt2",
  config_summary: {},
  graph: [
    {
      id: "block_1",
      type: "decoder_block",
      label: "Transformer block 1",
      meta: "masked attention + FFN",
      params: { hidden_size: 768, num_heads: 12, ffn_size: 3072 },
      param_count: 7_087_872,
      has_internals: true,
      input_shape: "[B, T, 768]",
      output_shape: "[B, T, 768]",
      children: [
        {
          id: "block_1.norm_1",
          type: "layer_norm",
          label: "LayerNorm",
          meta: "pre-attention norm",
          params: { dim: 768 },
          param_count: 1_536,
        },
      ],
    },
  ],
};

describe("DetailPanel", () => {
  it("renders nothing when nothing is selected", () => {
    useArchStore.setState({ spec, selectionPath: [], detailOpen: false });
    const { container } = render(<DetailPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when selection exists but detailOpen is false", () => {
    useArchStore.setState({
      spec,
      selectionPath: ["block_1"],
      detailOpen: false,
    });
    const { container } = render(<DetailPanel />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the selected node's label, meta, and type", () => {
    useArchStore.setState({
      spec,
      selectionPath: ["block_1"],
      detailOpen: true,
    });
    render(<DetailPanel />);
    expect(screen.getAllByText("Transformer block 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("masked attention + FFN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("decoder_block").length).toBeGreaterThan(0);
  });

  it("shows the configuration entries from params", () => {
    useArchStore.setState({
      spec,
      selectionPath: ["block_1"],
      detailOpen: true,
    });
    render(<DetailPanel />);
    // dt/dd grid — each key + its value
    expect(screen.getByText("hidden_size")).toBeInTheDocument();
    expect(screen.getByText("768")).toBeInTheDocument();
    expect(screen.getByText("num_heads")).toBeInTheDocument();
  });

  it("shows the formatted param count for nodes with parameters", () => {
    useArchStore.setState({
      spec,
      selectionPath: ["block_1"],
      detailOpen: true,
    });
    render(<DetailPanel />);
    expect(screen.getByText(/7\.1M/)).toBeInTheDocument();
    expect(screen.getByText(/\(7,087,872\)/)).toBeInTheDocument();
  });

  it("shows the Expand internals footer button only for has_internals nodes", () => {
    useArchStore.setState({
      spec,
      selectionPath: ["block_1"],
      detailOpen: true,
    });
    const { rerender } = render(<DetailPanel />);
    expect(screen.getByRole("button", { name: /Expand internals/ })).toBeInTheDocument();

    // Switch to a leaf — no expand button
    useArchStore.setState({
      spec,
      selectionPath: ["block_1", "block_1.norm_1"],
      detailOpen: true,
    });
    rerender(<DetailPanel />);
    expect(
      screen.queryByRole("button", { name: /Expand internals/ }),
    ).not.toBeInTheDocument();
  });

  it("clicking ✕ closes the panel", async () => {
    useArchStore.setState({
      spec,
      selectionPath: ["block_1"],
      detailOpen: true,
    });
    render(<DetailPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(useArchStore.getState().detailOpen).toBe(false);
  });

  it("surfaces role and category in a Classification section instead of a raw field dump", () => {
    const classified: Spec = {
      model_id: "m",
      model_type: "llama",
      config_summary: {},
      graph: [
        {
          id: "model.layers.0.self_attn",
          type: "some_unregistered_attention",
          label: "Self attention",
          module_path: "model.layers.0.self_attn",
          role: "attention",
          category: "attention",
          params: {},
        },
      ],
    };
    useArchStore.setState({
      spec: classified,
      selectionPath: ["model.layers.0.self_attn"],
      detailOpen: true,
    });
    render(<DetailPanel />);
    expect(screen.getByText("Classification")).toBeInTheDocument();
    expect(screen.getByText("role")).toBeInTheDocument();
    expect(screen.getByText("category")).toBeInTheDocument();
    // The debugging "Backend fields" dump has been removed.
    expect(screen.queryByText("Backend fields")).not.toBeInTheDocument();
  });
});
