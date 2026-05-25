import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ActivationNode } from "./ActivationNode";
import type { Node } from "../../domain/spec";

const silu: Node = {
  id: "model.layers.0.mlp.act_fn",
  type: "si_lu",
  label: "Act fn",
  module_class: "SiLU",
  category: "activation",
  params: {},
};

describe("ActivationNode", () => {
  it("renders the activation class name", () => {
    render(<ActivationNode node={silu} level={4} selected={false} />);
    expect(screen.getByText("SiLU")).toBeInTheDocument();
    expect(screen.getByText("activation")).toBeInTheDocument();
  });

  it("strips a trailing 'Activation' suffix from HuggingFace wrappers", () => {
    const hf: Node = { ...silu, module_class: "GELUActivation" };
    render(<ActivationNode node={hf} level={4} selected={false} />);
    expect(screen.getByText("GELU")).toBeInTheDocument();
    expect(screen.queryByText("GELUActivation")).not.toBeInTheDocument();
  });

  it("renders an SVG curve glyph", () => {
    const { container } = render(
      <ActivationNode node={silu} level={4} selected={false} />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("calls onSelect when clicked", async () => {
    const onSelect = vi.fn();
    render(
      <ActivationNode node={silu} level={4} selected={false} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(silu.id);
  });
});
