/**
 * Edge styling for the architecture canvas.
 *
 * Sequential edges (top→bottom along the chain) use React Flow's bezier with
 * a "round dot" stroke pattern + an arrowhead at the target so the direction
 * of data flow is unambiguous.
 *
 * Decoder-block skip edges (the residual arrows) use solid accent strokes
 * with an arrowhead, anchored to RIGHT-side handles so they arc out to the
 * right of the chain instead of overlapping the linear flow. They're how the
 * level-2 view answers "where does the skip start and where does it land."
 *
 * When a node is selected, edges connecting to it get recoloured:
 *   - edge ENTERING selected → green   (this is the input to the highlight)
 *   - edge LEAVING  selected → amber   (this is the output of the highlight)
 * This pairs with the green / amber node borders that GenericBlockNode
 * applies to predecessor / successor nodes.
 */

import { MarkerType, type Edge } from "@xyflow/react";

import type { Node as SpecNode } from "../../domain/spec";

export const HIGHLIGHT_COLORS = {
  selected: "#1a73e8", // Google Blue — current accent
  input: "#34a853", // Google Green — predecessor (feeds the selected node)
  output: "#fbbc04", // Google Yellow/Amber — successor (selected node feeds it)
} as const;

const SEQUENTIAL_STYLE = {
  stroke: "#9ca3af",
  strokeWidth: 1.5,
  // `1 6` = 1px dash + 6px gap → with round caps the dash becomes a circle,
  // giving evenly-spaced dots along the curve.
  strokeDasharray: "1 6",
  strokeLinecap: "round",
} as const;

const RESIDUAL_STYLE = {
  stroke: HIGHLIGHT_COLORS.selected, // same accent as the selected outline
  strokeWidth: 2,
  // No dasharray — solid line distinguishes the explicit skip path from the
  // inferable sequential flow.
} as const;

const EDGE_TYPE = "default" as const; // React Flow's bezier edge.

function arrowhead(color: string) {
  return {
    type: MarkerType.ArrowClosed,
    color,
    width: 14,
    height: 14,
  } as const;
}

/**
 * Dispatch by parent type:
 *  - `decoder_block` → linear chain + residual arcs (level-2 view of a block)
 *  - `self_attention` → Q/K/V → SDPA → O fan (level-3)
 *  - `sdpa` → every parallel head → concat (level-4)
 *  - everything else → straight linear chain (level-1, plus any leaf parent)
 */
export function buildEdges(
  nodes: ReadonlyArray<SpecNode>,
  parentType: string | null,
): Edge[] {
  if (parentType === "decoder_block") return buildDecoderBlockEdges(nodes);
  if (parentType === "self_attention") return buildAttentionEdges(nodes);
  if (parentType === "sdpa") return buildSdpaHeadEdges(nodes);
  return buildSequentialEdges(nodes);
}

function makeEdge(source: SpecNode, target: SpecNode): Edge {
  return {
    id: `${source.id}→${target.id}`,
    source: source.id,
    target: target.id,
    sourceHandle: "out",
    targetHandle: "in",
    type: EDGE_TYPE,
    style: SEQUENTIAL_STYLE,
    markerEnd: arrowhead(SEQUENTIAL_STYLE.stroke),
  };
}

function makeResidualEdge(source: SpecNode, target: SpecNode): Edge {
  return {
    id: `${source.id}↪${target.id}`,
    source: source.id,
    target: target.id,
    sourceHandle: "right-out",
    targetHandle: "right-in",
    type: "residual",
    label: "skip",
    style: RESIDUAL_STYLE,
    markerEnd: arrowhead(RESIDUAL_STYLE.stroke),
  };
}

function buildSequentialEdges(nodes: ReadonlyArray<SpecNode>): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push(makeEdge(nodes[i]!, nodes[i + 1]!));
  }
  return edges;
}

function buildDecoderBlockEdges(nodes: ReadonlyArray<SpecNode>): Edge[] {
  const seq = buildSequentialEdges(nodes);
  const input = nodes.find((n) => n.type === "block_input");
  const residuals = nodes.filter((n) => n.type === "residual_add");
  if (!input || residuals.length === 0) return seq;
  const skips: Edge[] = [makeResidualEdge(input, residuals[0]!)];
  for (let i = 1; i < residuals.length; i++) {
    skips.push(makeResidualEdge(residuals[i - 1]!, residuals[i]!));
  }
  return [...seq, ...skips];
}

function buildAttentionEdges(nodes: ReadonlyArray<SpecNode>): Edge[] {
  if (nodes.length < 5) return buildSequentialEdges(nodes);
  const [q, k, v, sdpa, o] = nodes as readonly [
    SpecNode, SpecNode, SpecNode, SpecNode, SpecNode,
  ];
  return [
    makeEdge(q, sdpa),
    makeEdge(k, sdpa),
    makeEdge(v, sdpa),
    makeEdge(sdpa, o),
  ];
}

function buildSdpaHeadEdges(nodes: ReadonlyArray<SpecNode>): Edge[] {
  if (nodes.length < 2) return [];
  const concat = nodes[nodes.length - 1]!;
  const heads = nodes.slice(0, -1);
  return heads.map((head) => makeEdge(head, concat));
}

/**
 * Builds the edge that connects the floating "Previous block" context card
 * to the first node of the current view. Renders in accent colour as a
 * solid 2-px stroke with an arrowhead so the "data flows from there into
 * this block" relationship is visually unambiguous — matches the callout
 * style of the context card.
 */
export function buildContextEdge(sourceId: string, targetId: string): Edge {
  const stroke = HIGHLIGHT_COLORS.selected;
  return {
    id: `${sourceId}↦${targetId}`,
    source: sourceId,
    target: targetId,
    sourceHandle: "out",
    targetHandle: "in",
    type: EDGE_TYPE,
    style: { stroke, strokeWidth: 2 },
    markerEnd: arrowhead(stroke),
  };
}

/**
 * Post-process an edge list to recolour edges touching the selected node.
 * Pure function — keeps `buildEdges` itself unaware of selection state.
 */
export function highlightEdgesForSelection(
  edges: ReadonlyArray<Edge>,
  selectedId: string | null,
): Edge[] {
  if (!selectedId) return [...edges];
  return edges.map((edge) => {
    if (edge.target === selectedId) {
      return {
        ...edge,
        style: { ...(edge.style ?? {}), stroke: HIGHLIGHT_COLORS.input, strokeWidth: 2, strokeDasharray: undefined, strokeLinecap: undefined },
        markerEnd: arrowhead(HIGHLIGHT_COLORS.input),
      };
    }
    if (edge.source === selectedId) {
      return {
        ...edge,
        style: { ...(edge.style ?? {}), stroke: HIGHLIGHT_COLORS.output, strokeWidth: 2, strokeDasharray: undefined, strokeLinecap: undefined },
        markerEnd: arrowhead(HIGHLIGHT_COLORS.output),
      };
    }
    return edge;
  });
}

/**
 * From an edge list and a selected node id, derive which nodes feed the
 * selected node (`inputs`) and which it feeds (`outputs`). Used by the
 * Canvas to tag rfNodes with their role so the block renderer can colour
 * the border.
 */
export function inputOutputForSelection(
  edges: ReadonlyArray<Edge>,
  selectedId: string | null,
): { inputs: Set<string>; outputs: Set<string> } {
  const inputs = new Set<string>();
  const outputs = new Set<string>();
  if (!selectedId) return { inputs, outputs };
  for (const edge of edges) {
    if (edge.target === selectedId) inputs.add(edge.source);
    if (edge.source === selectedId) outputs.add(edge.target);
  }
  return { inputs, outputs };
}
