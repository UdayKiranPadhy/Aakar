import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AttentionHeadNode } from "./AttentionHeadNode";
import type { Node } from "../../domain/spec";

const head: Node = {
  id: "block_1.attn.sdpa.head_3",
  type: "attention_head",
  label: "Head 3",
  meta: "softmax(Q3 · K3ᵀ / √64) · V3",
  params: { index: 3, head_dim: 64 },
  param_count: 0,
};

describe("AttentionHeadNode", () => {
  it("renders the label and per-head formula meta", () => {
    render(
      <AttentionHeadNode node={head} level={3} selected={false} />,
    );
    expect(screen.getByText("Head 3")).toBeInTheDocument();
    expect(screen.getByText(/softmax\(Q3 · K3ᵀ \/ √64\) · V3/)).toBeInTheDocument();
  });

  it("calls onSelect on click (heads are always leaves)", async () => {
    const onSelect = vi.fn();
    render(
      <AttentionHeadNode
        node={head}
        level={3}
        selected={false}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(head.id);
  });

  it("applies the green/amber/blue border classes based on role / selected", () => {
    const { container, rerender } = render(
      <AttentionHeadNode node={head} level={3} selected={true} />,
    );
    expect(container.firstElementChild?.className).toContain("cardSelected");

    rerender(
      <AttentionHeadNode node={head} level={3} selected={false} role="input" />,
    );
    expect(container.firstElementChild?.className).toContain("cardInput");

    rerender(
      <AttentionHeadNode node={head} level={3} selected={false} role="output" />,
    );
    expect(container.firstElementChild?.className).toContain("cardOutput");
  });
});
