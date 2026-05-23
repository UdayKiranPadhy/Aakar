import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModelInfoStrip } from "./ModelInfoStrip";
import { useArchStore } from "../../store/archStore";
import type { Spec } from "../../domain/spec";

function makeSpec(overrides: Partial<Spec> = {}): Spec {
  return {
    model_id: "meta-llama/Llama-3-8B",
    model_type: "llama",
    config_summary: { total_params: 8_000_000_000 },
    graph: [],
    ...overrides,
  };
}

describe("ModelInfoStrip", () => {
  it("renders nothing when no spec is loaded", () => {
    useArchStore.setState({ spec: undefined });
    const { container } = render(<ModelInfoStrip />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no facts are interesting", () => {
    // No dtype, no attn_impl, no position encoding, no GQA — empty strip.
    useArchStore.setState({
      spec: makeSpec({ config_summary: {} }),
    });
    const { container } = render(<ModelInfoStrip />);
    expect(container.firstChild).toBeNull();
  });

  it("renders pills for spec-level facts", () => {
    useArchStore.setState({
      spec: makeSpec({
        param_dtype: "bfloat16",
        attn_impl: "sdpa",
        position_encoding: "rope",
        tied_word_embeddings: true,
      }),
    });
    const { getByText } = render(<ModelInfoStrip />);
    expect(getByText("bfloat16")).toBeInTheDocument();
    expect(getByText("sdpa")).toBeInTheDocument();
    expect(getByText("rope")).toBeInTheDocument();
    expect(getByText("embeddings")).toBeInTheDocument();
  });

  it("renders GQA only when ratio > 1", () => {
    useArchStore.setState({
      spec: makeSpec({
        param_dtype: "bfloat16",
        config_summary: { total_params: 1, gqa_ratio: 4 },
      }),
    });
    const { getByText } = render(<ModelInfoStrip />);
    expect(getByText("4:1")).toBeInTheDocument();
  });

  it("computes the weights memory pill from total_params × dtype", () => {
    // 8B params × 2 bytes (bfloat16) ≈ 16 GB
    useArchStore.setState({
      spec: makeSpec({
        param_dtype: "bfloat16",
        config_summary: { total_params: 8_000_000_000 },
      }),
    });
    const { getByText } = render(<ModelInfoStrip />);
    expect(getByText("16.00 GB")).toBeInTheDocument();
  });

  it("renders an MoE pill when num_local_experts is set", () => {
    useArchStore.setState({
      spec: makeSpec({
        config_summary: {
          total_params: 1,
          num_local_experts: 8,
          num_experts_per_tok: 2,
        },
      }),
    });
    const { getByText } = render(<ModelInfoStrip />);
    expect(getByText("8×top-2")).toBeInTheDocument();
  });
});
