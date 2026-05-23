import { describe, expect, it } from "vitest";

import {
  HIGHLIGHT_COLORS,
  buildContextEdge,
  buildEdges,
  highlightEdgesForSelection,
  inputOutputForSelection,
} from "./edges";
import type { Node } from "../../domain/spec";

const node = (id: string, type = "linear"): Node => ({
  id,
  type,
  label: id,
  params: {},
});

describe("buildEdges — sequential (no parentType)", () => {
  it("produces N-1 edges for N nodes", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = buildEdges(nodes, null);
    expect(edges).toHaveLength(2);
    expect(edges[0]?.source).toBe("a");
    expect(edges[0]?.target).toBe("b");
    expect(edges[1]?.source).toBe("b");
    expect(edges[1]?.target).toBe("c");
  });

  it("each sequential edge has an arrowhead so direction is unambiguous", () => {
    const edges = buildEdges([node("a"), node("b")], null);
    expect(edges[0]?.markerEnd).toBeDefined();
  });

  it("uses the named bottom-out / top-in handles", () => {
    const edges = buildEdges([node("a"), node("b")], null);
    expect(edges[0]?.sourceHandle).toBe("out");
    expect(edges[0]?.targetHandle).toBe("in");
  });

  it("returns an empty edge list for a single node", () => {
    expect(buildEdges([node("a")], null)).toEqual([]);
  });
});

describe("buildEdges — self_attention fan", () => {
  it("emits Q→SDPA, K→SDPA, V→SDPA, SDPA→O (4 edges)", () => {
    const nodes = [
      node("q"),
      node("k"),
      node("v"),
      node("sdpa", "sdpa"),
      node("o"),
    ];
    const edges = buildEdges(nodes, "self_attention");
    expect(edges).toHaveLength(4);
    expect(edges.map((e) => `${e.source}→${e.target}`)).toEqual([
      "q→sdpa",
      "k→sdpa",
      "v→sdpa",
      "sdpa→o",
    ]);
  });

  it("falls back to sequential if the attention layout is malformed (< 5 children)", () => {
    const edges = buildEdges([node("q"), node("k")], "self_attention");
    expect(edges).toHaveLength(1);
    expect(edges[0]?.source).toBe("q");
  });
});

describe("buildEdges — sdpa head fan", () => {
  it("fans every head into the trailing concat node", () => {
    const heads = Array.from({ length: 4 }, (_, i) =>
      node(`head_${i}`, "attention_head"),
    );
    const concat = node("concat", "head_concat");
    const edges = buildEdges([...heads, concat], "sdpa");
    expect(edges).toHaveLength(4);
    for (const e of edges) {
      expect(e.target).toBe("concat");
    }
  });

  it("returns empty when there are fewer than 2 children", () => {
    expect(buildEdges([node("concat", "head_concat")], "sdpa")).toEqual([]);
  });
});

describe("buildEdges — decoder_block (sequential + residual skips)", () => {
  it("includes sequential edges plus one residual per +residual node", () => {
    const nodes: Node[] = [
      { id: "in", type: "block_input", label: "Block input", params: {} },
      { id: "norm_1", type: "layer_norm", label: "LayerNorm", params: {} },
      { id: "attn", type: "self_attention", label: "MHA", params: {} },
      { id: "add_1", type: "residual_add", label: "+ residual", params: {} },
      { id: "norm_2", type: "layer_norm", label: "LayerNorm", params: {} },
      { id: "ffn", type: "feed_forward", label: "FFN", params: {} },
      { id: "add_2", type: "residual_add", label: "+ residual", params: {} },
    ];
    const edges = buildEdges(nodes, "decoder_block");
    // 6 sequential + 2 residual (in→add_1, add_1→add_2)
    expect(edges).toHaveLength(8);

    const residuals = edges.filter((e) => e.type === "residual");
    expect(residuals).toHaveLength(2);
    expect(residuals[0]?.source).toBe("in");
    expect(residuals[0]?.target).toBe("add_1");
    expect(residuals[1]?.source).toBe("add_1");
    expect(residuals[1]?.target).toBe("add_2");
  });

  it("residual edges anchor to the right-side handles so they arc out", () => {
    const nodes: Node[] = [
      { id: "in", type: "block_input", label: "in", params: {} },
      { id: "add", type: "residual_add", label: "+ residual", params: {} },
    ];
    const edges = buildEdges(nodes, "decoder_block");
    const residual = edges.find((e) => e.type === "residual");
    expect(residual?.sourceHandle).toBe("right-out");
    expect(residual?.targetHandle).toBe("right-in");
    expect(residual?.label).toBe("skip");
  });

  it("falls back to plain sequential when no block_input is present", () => {
    const nodes: Node[] = [
      { id: "norm", type: "layer_norm", label: "n", params: {} },
      { id: "add", type: "residual_add", label: "+ r", params: {} },
    ];
    const edges = buildEdges(nodes, "decoder_block");
    expect(edges).toHaveLength(1);
    expect(edges[0]?.type).not.toBe("residual");
  });
});

describe("inputOutputForSelection", () => {
  const edges = [
    { id: "a→b", source: "a", target: "b" },
    { id: "b→c", source: "b", target: "c" },
    { id: "b→d", source: "b", target: "d" },
  ];

  it("returns predecessors as inputs and successors as outputs", () => {
    const { inputs, outputs } = inputOutputForSelection(edges, "b");
    expect([...inputs]).toEqual(["a"]);
    expect([...outputs].sort()).toEqual(["c", "d"]);
  });

  it("returns empty sets when nothing is selected", () => {
    const { inputs, outputs } = inputOutputForSelection(edges, null);
    expect(inputs.size).toBe(0);
    expect(outputs.size).toBe(0);
  });

  it("collects multiple predecessors (fan-in)", () => {
    const fan = [
      { id: "x→z", source: "x", target: "z" },
      { id: "y→z", source: "y", target: "z" },
    ];
    const { inputs } = inputOutputForSelection(fan, "z");
    expect([...inputs].sort()).toEqual(["x", "y"]);
  });
});

describe("buildContextEdge", () => {
  it("connects via bottom-out → top-in handles (matches sequential edges)", () => {
    const edge = buildContextEdge("__context__block_1", "block_2.input");
    expect(edge.source).toBe("__context__block_1");
    expect(edge.target).toBe("block_2.input");
    expect(edge.sourceHandle).toBe("out");
    expect(edge.targetHandle).toBe("in");
  });

  it("has an arrowhead so the direction (context → current block) is clear", () => {
    const edge = buildContextEdge("a", "b");
    expect(edge.markerEnd).toBeDefined();
  });
});

describe("highlightEdgesForSelection", () => {
  const original = [
    { id: "a→b", source: "a", target: "b", style: { stroke: "#9ca3af" } },
    { id: "b→c", source: "b", target: "c", style: { stroke: "#9ca3af" } },
    { id: "c→d", source: "c", target: "d", style: { stroke: "#9ca3af" } },
  ];

  it("returns the edges unchanged when nothing is selected", () => {
    const out = highlightEdgesForSelection(original, null);
    expect(out).toHaveLength(3);
    expect(out[0]?.style?.stroke).toBe("#9ca3af");
  });

  it("recolours the incoming edge to green", () => {
    const out = highlightEdgesForSelection(original, "b");
    const incoming = out.find((e) => e.target === "b");
    expect(incoming?.style?.stroke).toBe(HIGHLIGHT_COLORS.input);
  });

  it("recolours the outgoing edge to amber", () => {
    const out = highlightEdgesForSelection(original, "b");
    const outgoing = out.find((e) => e.source === "b");
    expect(outgoing?.style?.stroke).toBe(HIGHLIGHT_COLORS.output);
  });

  it("leaves untouched edges alone", () => {
    const out = highlightEdgesForSelection(original, "b");
    const untouched = out.find((e) => e.id === "c→d");
    expect(untouched?.style?.stroke).toBe("#9ca3af");
  });
});
