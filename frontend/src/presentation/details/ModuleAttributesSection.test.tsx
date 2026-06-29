import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ModuleAttributesSection } from "./ModuleAttributesSection";
import type { Node } from "../../domain/spec";

const node: Node = {
  id: "n",
  type: "qwen2_attention",
  label: "Attn",
  module_class: "Qwen2Attention",
  params: { head_dim: 64, num_key_value_groups: 7, scaling: 0.125 },
};

describe("ModuleAttributesSection", () => {
  it("titles the section with the class name and reveals every attribute on expand", async () => {
    render(<ModuleAttributesSection node={node} />);
    const toggle = screen.getByRole("button", { name: /Qwen2Attention attributes/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("num_key_value_groups")).toBeNull(); // collapsed by default

    await userEvent.click(toggle);
    expect(screen.getByText("num_key_value_groups")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("scaling")).toBeInTheDocument();
  });

  it("renders nothing when the module has no attributes", () => {
    const { container } = render(<ModuleAttributesSection node={{ ...node, params: {} }} />);
    expect(container.firstChild).toBeNull();
  });

  it("falls back to a generic title when the class name is absent", () => {
    render(<ModuleAttributesSection node={{ ...node, module_class: undefined }} />);
    expect(screen.getByRole("button", { name: /Attributes/ })).toBeInTheDocument();
  });
});
