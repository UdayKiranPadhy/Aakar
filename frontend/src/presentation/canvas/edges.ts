/**
 * Edge styling for the architecture canvas.
 *
 * v0.1 uses React Flow's built-in `straight` edge with a custom dotted style;
 * a custom edge component isn't worth the complexity yet.
 */

import type { Edge } from "@xyflow/react";

import type { Node as SpecNode } from "../../domain/spec";

const EDGE_STYLE = {
  stroke: "#9ca3af",
  strokeDasharray: "3 3",
  strokeWidth: 1.5,
} as const;

/**
 * Connect every node to the next one in adapter order. The graph is a
 * vertical chain at level 1/2; at level 3 (self_attention) we *also* draw
 * the fan-in/out edges so Q/K/V → SDPA → O reads as a flow.
 */
export function buildEdges(
  nodes: ReadonlyArray<SpecNode>,
  parentType: string | null,
): Edge[] {
  if (parentType === "self_attention") return buildAttentionEdges(nodes);
  return buildSequentialEdges(nodes);
}

function buildSequentialEdges(nodes: ReadonlyArray<SpecNode>): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    edges.push({
      id: `${a.id}→${b.id}`,
      source: a.id,
      target: b.id,
      type: "straight",
      style: EDGE_STYLE,
    });
  }
  return edges;
}

function buildAttentionEdges(nodes: ReadonlyArray<SpecNode>): Edge[] {
  // Children come in order: Q, K, V, SDPA, O. Fan from QKV into SDPA, then SDPA → O.
  if (nodes.length < 5) return buildSequentialEdges(nodes);
  const q = nodes[0]!, k = nodes[1]!, v = nodes[2]!, sdpa = nodes[3]!, o = nodes[4]!;
  return [
    { id: `${q.id}→${sdpa.id}`, source: q.id, target: sdpa.id, type: "straight", style: EDGE_STYLE },
    { id: `${k.id}→${sdpa.id}`, source: k.id, target: sdpa.id, type: "straight", style: EDGE_STYLE },
    { id: `${v.id}→${sdpa.id}`, source: v.id, target: sdpa.id, type: "straight", style: EDGE_STYLE },
    { id: `${sdpa.id}→${o.id}`, source: sdpa.id, target: o.id, type: "straight", style: EDGE_STYLE },
  ];
}
