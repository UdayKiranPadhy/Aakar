import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Node } from "../../domain/spec";
import { BackendFieldsSection } from "./BackendFieldsSection";

describe("BackendFieldsSection", () => {
  it("shows non-null backend fields, including false booleans", () => {
    const node: Node = {
      id: "lm_head",
      type: "linear",
      label: "Language Model Head",
      meta: "Linear",
      module_class: "Linear",
      module_path: "lm_head",
      params: { in_features: 768, out_features: 50_257, has_bias: false },
      has_internals: false,
      param_count: 38_597_376,
      input_shape: "[B, S, 768]",
      output_shape: "[B, S, 50257]",
      weight_shape: [50_257, 768],
      memory_bytes: 154_389_504,
    };

    render(<BackendFieldsSection node={node} />);

    expect(screen.getByText("module_path")).toBeInTheDocument();
    expect(screen.getAllByText("lm_head").length).toBeGreaterThan(0);
    expect(screen.getByText("module_class")).toBeInTheDocument();
    expect(screen.getAllByText("Linear").length).toBeGreaterThan(0);
    expect(screen.getByText("has_internals")).toBeInTheDocument();
    expect(screen.getByText("false")).toBeInTheDocument();
    expect(screen.getByText("params")).toBeInTheDocument();
    expect(screen.getByText(/"has_bias":false/)).toBeInTheDocument();
  });
});
