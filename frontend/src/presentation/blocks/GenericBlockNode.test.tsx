import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GenericBlockNode } from "./GenericBlockNode";
import type { Node } from "../../domain/spec";

const leaf: Node = {
  id: "node_1",
  type: "linear",
  label: "Q proj",
  meta: "in 768 → out 768",
  params: { bias: true },
  param_count: 590_592,
};

const internalNode: Node = {
  id: "block_1",
  type: "decoder_block",
  label: "Transformer block 1",
  meta: "masked attention + FFN",
  params: {},
  param_count: 7_087_872,
  has_internals: true,
  children: [],
};

describe("GenericBlockNode rendering", () => {
  it("renders the label, meta, and formatted param count", () => {
    render(
      <GenericBlockNode node={leaf} level={2} selected={false} />,
    );
    expect(screen.getByText("Q proj")).toBeInTheDocument();
    expect(screen.getByText(/in 768 → out 768/)).toBeInTheDocument();
    expect(screen.getByText(/590\.6K params/)).toBeInTheDocument();
  });

  it("omits the params line when param_count is 0", () => {
    const zeroParam: Node = { ...leaf, param_count: 0 };
    render(
      <GenericBlockNode node={zeroParam} level={2} selected={false} />,
    );
    expect(screen.queryByText(/params/)).not.toBeInTheDocument();
  });

  it("renders the weight_shape line when present", () => {
    const withShape: Node = {
      ...leaf,
      weight_shape: [4096, 4096],
    };
    render(<GenericBlockNode node={withShape} level={2} selected={false} />);
    expect(screen.getByText(/W 4096 × 4096/)).toBeInTheDocument();
  });

  it("appends '+bias' when bias_shape is present", () => {
    const withBias: Node = {
      ...leaf,
      weight_shape: [4096, 4096],
      bias_shape: [4096],
    };
    render(<GenericBlockNode node={withBias} level={2} selected={false} />);
    expect(screen.getByText(/\+bias/)).toBeInTheDocument();
  });

  it("hides the shape line when weight_shape is absent", () => {
    render(<GenericBlockNode node={leaf} level={2} selected={false} />);
    expect(screen.queryByText(/^W /)).not.toBeInTheDocument();
  });

  it("renders symbolic input/output shapes when present", () => {
    const withIO: Node = {
      ...leaf,
      input_shape: "[B, S, 768]",
      output_shape: "[B, S, 768]",
    };
    render(<GenericBlockNode node={withIO} level={2} selected={false} />);
    expect(screen.getAllByText("[B, S, 768]")).toHaveLength(2);
  });

  it("appends a memory tag when memory_bytes is present", () => {
    const withMem: Node = { ...leaf, memory_bytes: 2_362_368 };
    render(<GenericBlockNode node={withMem} level={2} selected={false} />);
    // 2.36 MB on a 590K-param Linear at fp32 — appears next to the param line.
    expect(screen.getByText(/2\.4 MB/)).toBeInTheDocument();
  });

  it("renders the activation function for MLP-like nodes", () => {
    const withAct: Node = { ...leaf, activation: "SiLUActivation" };
    render(<GenericBlockNode node={withAct} level={2} selected={false} />);
    expect(screen.getByText(/act SiLUActivation/)).toBeInTheDocument();
  });

  it("renders the FLOPs line when flops > 0", () => {
    const withFlops: Node = { ...leaf, flops: 2_100_000_000 };
    render(<GenericBlockNode node={withFlops} level={2} selected={false} />);
    expect(screen.getByText("2.10 GF")).toBeInTheDocument();
  });
});

describe("GenericBlockNode interaction — click always selects (two-step expand)", () => {
  it("calls onSelect on click for leaf nodes", async () => {
    const onSelect = vi.fn();
    const onExpand = vi.fn();
    render(
      <GenericBlockNode
        node={leaf}
        level={2}
        selected={false}
        onSelect={onSelect}
        onExpand={onExpand}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: leaf.label }));
    expect(onSelect).toHaveBeenCalledWith("node_1");
    expect(onExpand).not.toHaveBeenCalled();
  });

  it("calls onSelect (NOT onExpand) on click even when the node has internals", async () => {
    // Regression test for the "click directly opens" UX: a card with
    // has_internals should still only select on click — drilling in requires
    // the explicit Expand pill or the detail-panel button.
    const onSelect = vi.fn();
    const onExpand = vi.fn();
    render(
      <GenericBlockNode
        node={internalNode}
        level={1}
        selected={false}
        onSelect={onSelect}
        onExpand={onExpand}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: internalNode.label }));
    expect(onSelect).toHaveBeenCalledWith("block_1");
    expect(onExpand).not.toHaveBeenCalled();
  });

  it("treats Enter and Space as click for keyboard users", async () => {
    const onSelect = vi.fn();
    render(
      <GenericBlockNode
        node={leaf}
        level={2}
        selected={false}
        onSelect={onSelect}
      />,
    );
    const card = screen.getByRole("button", { name: leaf.label });
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});

describe("GenericBlockNode 'Expand internals' pill", () => {
  it("is HIDDEN when not selected, even if the node has internals", () => {
    render(
      <GenericBlockNode
        node={internalNode}
        level={1}
        selected={false}
        onExpand={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Expand .* internals/ }),
    ).not.toBeInTheDocument();
  });

  it("is HIDDEN for leaf nodes when selected", () => {
    render(
      <GenericBlockNode
        node={leaf}
        level={2}
        selected={true}
        onExpand={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Expand .* internals/ }),
    ).not.toBeInTheDocument();
  });

  it("APPEARS when the card is selected and has internals", () => {
    render(
      <GenericBlockNode
        node={internalNode}
        level={1}
        selected={true}
        onExpand={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Expand .* internals/ }),
    ).toBeInTheDocument();
  });

  it("clicking the pill calls onExpand with the node id", async () => {
    const onSelect = vi.fn();
    const onExpand = vi.fn();
    render(
      <GenericBlockNode
        node={internalNode}
        level={1}
        selected={true}
        onSelect={onSelect}
        onExpand={onExpand}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Expand .* internals/ }),
    );
    expect(onExpand).toHaveBeenCalledWith("block_1");
  });

  it("clicking the pill does NOT re-select the card (event.stopPropagation)", async () => {
    // The pill is nested inside the card, so without stopPropagation a click
    // on the pill would bubble to the card's onClick. We need the pill to be
    // a pure 'drill in' action, not a select-then-drill double-fire.
    const onSelect = vi.fn();
    const onExpand = vi.fn();
    render(
      <GenericBlockNode
        node={internalNode}
        level={1}
        selected={true}
        onSelect={onSelect}
        onExpand={onExpand}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Expand .* internals/ }),
    );
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("GenericBlockNode role-based highlighting", () => {
  it("applies cardSelected when selected=true", () => {
    const { container } = render(
      <GenericBlockNode node={leaf} level={2} selected={true} />,
    );
    expect(container.firstElementChild?.className).toContain("cardSelected");
  });

  it("applies cardInput when role='input'", () => {
    const { container } = render(
      <GenericBlockNode
        node={leaf}
        level={2}
        selected={false}
        role="input"
      />,
    );
    expect(container.firstElementChild?.className).toContain("cardInput");
  });

  it("applies cardOutput when role='output'", () => {
    const { container } = render(
      <GenericBlockNode
        node={leaf}
        level={2}
        selected={false}
        role="output"
      />,
    );
    expect(container.firstElementChild?.className).toContain("cardOutput");
  });
});
