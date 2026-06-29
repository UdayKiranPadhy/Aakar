import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NormalizationDetail } from "./NormalizationDetail";
import { useArchStore } from "../../store/archStore";
import type { Node, Operation, Spec } from "../../domain/spec";

useArchStore.setState({ spec: { config_summary: {} } as unknown as Spec });

function normNode(over: Partial<Node> = {}): Node {
  return {
    id: "model.layers.0.input_layernorm",
    type: "llama_rms_norm",
    label: "Input layernorm",
    module_class: "LlamaRMSNorm",
    role: "norm",
    params: { eps: 1e-5 },
    weight_shape: [4096],
    ...over,
  };
}

const op = (name: string): Operation => ({
  id: name,
  op: name,
  label: name,
  category: "elementwise",
  inputs: [],
});

/** The value cell next to a labelled field row (dt → dd). */
function rowValue(label: string): string | null | undefined {
  return screen.getByText(label).nextElementSibling?.textContent;
}

describe("NormalizationDetail", () => {
  it("reports RMSNorm from the traced rsqrt op and no learnable bias", () => {
    render(<NormalizationDetail node={normNode({ operations: [op("pow"), op("rsqrt"), op("mul")] })} />);
    // Assert via the row value — "RMSNorm" also appears in the concept copy.
    expect(rowValue("Variant (traced)")).toBe("RMSNorm");
    expect(rowValue("Learnable bias")).toBe("No"); // bias absent on this RMSNorm node
    expect(rowValue("Learnable scale")).toBe("Yes"); // weight_shape present
    expect(screen.getByText("0.00001")).toBeInTheDocument(); // eps value (unique)
  });

  it("reports LayerNorm from the traced native_layer_norm op", () => {
    render(
      <NormalizationDetail
        node={normNode({ module_class: "LayerNorm", bias_shape: [768], operations: [op("native_layer_norm")] })}
      />,
    );
    expect(rowValue("Variant (traced)")).toBe("LayerNorm");
    expect(rowValue("Learnable bias")).toBe("Yes"); // bias_shape present
  });

  it("renders without a variant row when not traced, still showing facts", () => {
    render(<NormalizationDetail node={normNode()} />);
    expect(screen.getByText("Concept & Education")).toBeInTheDocument();
    expect(screen.queryByText("Variant (traced)")).toBeNull();
  });
});
