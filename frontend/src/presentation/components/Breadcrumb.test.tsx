import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "./Breadcrumb";
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
      params: {},
      has_internals: true,
      children: [
        {
          id: "block_1.attn",
          type: "self_attention",
          label: "Masked multi-head attention",
          params: {},
          has_internals: true,
        },
      ],
    },
  ],
};

describe("Breadcrumb", () => {
  it("renders nothing when expansionPath is empty (root view)", () => {
    useArchStore.setState({ spec, expansionPath: [] });
    const { container } = render(<Breadcrumb />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the root model id + one crumb at level 2", () => {
    useArchStore.setState({ spec, expansionPath: ["block_1"] });
    render(<Breadcrumb />);
    expect(screen.getByText(/← gpt2/)).toBeInTheDocument();
    expect(screen.getByText("Transformer block 1")).toBeInTheDocument();
  });

  it("disables the last (current) crumb but keeps earlier ones clickable", () => {
    useArchStore.setState({
      spec,
      expansionPath: ["block_1", "block_1.attn"],
    });
    render(<Breadcrumb />);
    const crumbs = [
      screen.getByRole("button", { name: "Transformer block 1" }),
      screen.getByRole("button", { name: "Masked multi-head attention" }),
    ];
    expect(crumbs[0]).not.toBeDisabled();
    expect(crumbs[1]).toBeDisabled();
  });

  it("clicking the root crumb collapses to level 1", async () => {
    useArchStore.setState({
      spec,
      expansionPath: ["block_1", "block_1.attn"],
    });
    render(<Breadcrumb />);
    await userEvent.click(screen.getByText(/← gpt2/));
    expect(useArchStore.getState().expansionPath).toEqual([]);
  });

  it("clicking a non-final crumb collapses to that level", async () => {
    useArchStore.setState({
      spec,
      expansionPath: ["block_1", "block_1.attn"],
    });
    render(<Breadcrumb />);
    await userEvent.click(
      screen.getByRole("button", { name: "Transformer block 1" }),
    );
    expect(useArchStore.getState().expansionPath).toEqual(["block_1"]);
  });
});
