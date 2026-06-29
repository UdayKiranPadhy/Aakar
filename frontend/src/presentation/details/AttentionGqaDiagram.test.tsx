import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AttentionGqaDiagram } from "./AttentionGqaDiagram";

describe("AttentionGqaDiagram", () => {
  it("renders nothing for plain multi-head attention (kv == heads)", () => {
    const { container } = render(<AttentionGqaDiagram numHeads={12} kvHeads={12} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when a head count is missing/invalid", () => {
    expect(render(<AttentionGqaDiagram numHeads={0} kvHeads={0} />).container.firstChild).toBeNull();
    expect(render(<AttentionGqaDiagram numHeads={8} kvHeads={0} />).container.firstChild).toBeNull();
  });

  it("renders a grouping diagram for GQA (kv < heads)", () => {
    const { container, getByRole } = render(<AttentionGqaDiagram numHeads={32} kvHeads={8} />);
    expect(container.querySelector("svg")).not.toBeNull();
    // 32 query rects + 8 kv rects.
    expect(container.querySelectorAll("rect").length).toBe(40);
    expect(getByRole("img").getAttribute("aria-label")).toMatch(/32 query heads.*8 shared/);
  });

  it("labels a single-KV model as MQA", () => {
    const { getByRole } = render(<AttentionGqaDiagram numHeads={16} kvHeads={1} />);
    expect(getByRole("img").getAttribute("aria-label")).toMatch(/MQA/);
  });
});
