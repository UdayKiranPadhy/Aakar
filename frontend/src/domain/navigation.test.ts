import { describe, expect, it } from "vitest";

import {
  findNodeByPath,
  levelFromExpansion,
  resolveBreadcrumbNodes,
  resolveCurrentView,
} from "./navigation";
import type { Node } from "./spec";

// Minimal graph fixture mirroring the actual GPT-2 / Llama shape so the tests
// read closely to what a real spec looks like.
const fakeGraph: ReadonlyArray<Node> = [
  { id: "embed", type: "token_embedding", label: "Token embedding", params: {} },
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
        label: "Self-attention",
        params: {},
        has_internals: true,
        children: [
          { id: "block_1.attn.q", type: "linear", label: "Q proj", params: {} },
          { id: "block_1.attn.sdpa", type: "sdpa", label: "SDPA", params: {} },
        ],
      },
      { id: "block_1.add", type: "residual_add", label: "+ residual", params: {} },
    ],
  },
  { id: "lm_head", type: "lm_head", label: "Output", params: {} },
];

describe("levelFromExpansion", () => {
  it("returns 1 when nothing is expanded", () => {
    expect(levelFromExpansion([])).toBe(1);
  });

  it("returns 2 with one expansion", () => {
    expect(levelFromExpansion(["block_1"])).toBe(2);
  });

  it("returns 3 with two expansions", () => {
    expect(levelFromExpansion(["block_1", "block_1.attn"])).toBe(3);
  });

  it("caps at 3 for deeper expansions (level is for styling, not depth)", () => {
    expect(levelFromExpansion(["a", "b", "c", "d", "e"])).toBe(3);
  });
});

describe("findNodeByPath", () => {
  it("returns null for an empty path", () => {
    expect(findNodeByPath(fakeGraph, [])).toBeNull();
  });

  it("walks one level deep", () => {
    const node = findNodeByPath(fakeGraph, ["block_1"]);
    expect(node?.id).toBe("block_1");
    expect(node?.label).toBe("Transformer block 1");
  });

  it("walks two levels deep", () => {
    const node = findNodeByPath(fakeGraph, ["block_1", "block_1.attn"]);
    expect(node?.id).toBe("block_1.attn");
    expect(node?.type).toBe("self_attention");
  });

  it("walks three levels deep (no depth cap on tree)", () => {
    const node = findNodeByPath(fakeGraph, ["block_1", "block_1.attn", "block_1.attn.sdpa"]);
    expect(node?.type).toBe("sdpa");
  });

  it("returns null when an id along the path doesn't exist", () => {
    expect(findNodeByPath(fakeGraph, ["block_1", "ghost"])).toBeNull();
  });

  it("returns null when the first id doesn't exist", () => {
    expect(findNodeByPath(fakeGraph, ["ghost"])).toBeNull();
  });
});

describe("resolveCurrentView", () => {
  it("returns the root graph when nothing is expanded", () => {
    const view = resolveCurrentView(fakeGraph, []);
    expect(view).toBe(fakeGraph);
    expect(view).toHaveLength(3);
  });

  it("returns the children of the expanded node", () => {
    const view = resolveCurrentView(fakeGraph, ["block_1"]);
    expect(view).toHaveLength(2);
    expect(view[0]?.id).toBe("block_1.attn");
  });

  it("returns an empty array when the expansion path is invalid", () => {
    expect(resolveCurrentView(fakeGraph, ["ghost"])).toEqual([]);
  });

  it("returns the leaf's empty children array for a leaf path", () => {
    // sdpa.children is undefined → falls back to []
    expect(
      resolveCurrentView(fakeGraph, ["block_1", "block_1.add"]),
    ).toEqual([]);
  });
});

describe("resolveBreadcrumbNodes", () => {
  it("returns an empty array for the root view", () => {
    expect(resolveBreadcrumbNodes(fakeGraph, [])).toEqual([]);
  });

  it("returns one node for a single-level expansion", () => {
    const crumbs = resolveBreadcrumbNodes(fakeGraph, ["block_1"]);
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]?.id).toBe("block_1");
  });

  it("returns the full chain of nodes along the path", () => {
    const crumbs = resolveBreadcrumbNodes(fakeGraph, [
      "block_1",
      "block_1.attn",
      "block_1.attn.sdpa",
    ]);
    expect(crumbs.map((c) => c.id)).toEqual([
      "block_1",
      "block_1.attn",
      "block_1.attn.sdpa",
    ]);
  });

  it("skips ids that don't resolve (defensive — shouldn't happen in practice)", () => {
    // First two resolve, third doesn't.
    const crumbs = resolveBreadcrumbNodes(fakeGraph, ["block_1", "ghost"]);
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]?.id).toBe("block_1");
  });
});
