/**
 * Generic operation-flow: render a single module's forward-pass computation as a
 * dataflow DAG, driven entirely by the backend's `node.operations` trace.
 *
 * This is the family-agnostic generalization of the hand-authored attention /
 * MLP glyphs in `semanticFlow.ts`. Where `semanticFlow` arranges a parent's
 * child *modules*, this arranges a single module's own *ATen ops* — the math the
 * backend's fake-tensor tracer captured (see `fx_operations.py`). It works for
 * every module, including leaves (a Linear's `mm`, an RMSNorm's `pow/mean/...`),
 * which have ops but no children to drill into.
 *
 * The op list is per-module and non-recursive: child-module calls don't appear,
 * so an op's `inputs` that don't resolve to a sibling op are the module's *input*
 * (a source); ops nothing consumes are the module *output*. We never invent
 * structure — every node and edge comes straight from the trace.
 */

import type { Edge } from "@xyflow/react";

import type { Node as SpecNode, Operation } from "../../domain/spec";
import type {
  BlockVisualTone,
  BlockVisualVariant,
} from "../blocks/BlockRegistry";
import type { LayoutPosition } from "../layout/LayoutRegistry";
import { makeFlowEdge } from "./edges";
import type { SemanticFlow } from "./semanticFlow";

const OP_PREFIX = "__op__";

/** True for the synthetic nodes this builder fabricates (one per traced op). */
export function isOpFlowNode(node: SpecNode): boolean {
  return node.id.startsWith(OP_PREFIX);
}

// Op category → an existing block tone, so op glyphs reuse the canvas palette
// without growing the tone vocabulary. Mirrors OperationsSection's coloring.
const CATEGORY_TONE: Record<string, BlockVisualTone> = {
  matmul: "matrix",
  norm: "norm",
  activation: "attention",
  attention: "attention",
  elementwise: "residual",
  embedding: "embedding",
  shape: "io",
  other: "io",
};

const COL_X = 220; // horizontal stride between dataflow depths
const ROW_Y = 112; // vertical stride between ops sharing a depth

/**
 * Build the op-DAG for one module. Returns `null` when the module wasn't traced
 * (no `operations`), or when hiding shape ops leaves nothing to show.
 *
 * `hideShapeOps` drops pure tensor-reshuffle ops (view/transpose/reshape/…) and
 * bridges edges across them, so a 40-op attention collapses to the matmul →
 * softmax → matmul story that actually teaches something.
 */
export function buildOperationFlow(
  module: SpecNode,
  opts: { hideShapeOps: boolean },
): SemanticFlow | null {
  const ops = module.operations;
  if (!ops || ops.length === 0) return null;

  const visible = opts.hideShapeOps
    ? ops.filter((op) => op.category !== "shape")
    : [...ops];
  if (visible.length === 0) return null;

  const byId = new Map(ops.map((op) => [op.id, op] as const));
  const visibleIds = new Set(visible.map((op) => op.id));

  // Resolve an op's inputs to *visible* producer ids, walking transitively through
  // any hidden (shape) ops. Inputs that don't resolve to a known op — the module's
  // own input, or a tensor from another module — are dropped (the op is a source).
  const resolveInputs = (op: Operation): string[] => {
    const out: string[] = [];
    const seen = new Set<string>();
    const walk = (id: string): void => {
      if (seen.has(id)) return;
      seen.add(id);
      if (visibleIds.has(id)) {
        if (!out.includes(id)) out.push(id);
        return;
      }
      const hidden = byId.get(id);
      if (!hidden) return; // module input / cross-module → source
      for (const upstream of hidden.inputs) walk(upstream);
    };
    for (const id of op.inputs) walk(id);
    return out;
  };

  const resolved = new Map<string, string[]>(
    visible.map((op) => [op.id, resolveInputs(op)] as const),
  );

  const nodeId = (opId: string): string => `${OP_PREFIX}${module.id}.${opId}`;

  const nodes: SpecNode[] = visible.map((op) => ({
    id: nodeId(op.id),
    type: "operation",
    label: op.label,
    meta: op.out_shape,
    // Stash the raw op + category so the renderer can colour/badge without a
    // second lookup, and so the click-to-explain panel can key off them.
    params: { category: op.category, op: op.op },
  }));
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));

  const edges: Edge[] = [];
  for (const op of visible) {
    const target = nodeById.get(nodeId(op.id));
    if (!target) continue;
    for (const srcId of resolved.get(op.id) ?? []) {
      const source = nodeById.get(nodeId(srcId));
      if (source) edges.push(makeFlowEdge(source, target));
    }
  }

  const positions = layeredPositions(visible, resolved, nodeId);

  const tones = new Map<string, BlockVisualTone>(
    visible.map((op) => [nodeId(op.id), CATEGORY_TONE[op.category] ?? "io"]),
  );

  return {
    nodes,
    positions,
    edges,
    // Op nodes resolve their renderer by `type: "operation"` in the BlockRegistry,
    // so they need no visual variant.
    variants: new Map<string, BlockVisualVariant>(),
    tones,
    fitViewOptions: { padding: 0.2, maxZoom: 1, minZoom: 0.4 },
  };
}

/**
 * Longest-path layering: an op's column is one past the deepest of its (resolved)
 * inputs; sources sit in column 0. Within a column, ops keep execution order and
 * are vertically centred so the DAG reads left-to-right and stays balanced.
 */
function layeredPositions(
  visible: ReadonlyArray<Operation>,
  resolved: ReadonlyMap<string, string[]>,
  nodeId: (opId: string) => string,
): LayoutPosition[] {
  const col = new Map<string, number>();
  const columnOf = (opId: string): number => {
    const cached = col.get(opId);
    if (cached !== undefined) return cached;
    col.set(opId, 0); // guard against unexpected cycles
    const inputs = resolved.get(opId) ?? [];
    const value = inputs.length
      ? Math.max(...inputs.map(columnOf)) + 1
      : 0;
    col.set(opId, value);
    return value;
  };
  for (const op of visible) columnOf(op.id);

  const countPerCol = new Map<number, number>();
  for (const op of visible) {
    const c = col.get(op.id)!;
    countPerCol.set(c, (countPerCol.get(c) ?? 0) + 1);
  }

  const cursorPerCol = new Map<number, number>();
  return visible.map((op) => {
    const c = col.get(op.id)!;
    const row = cursorPerCol.get(c) ?? 0;
    cursorPerCol.set(c, row + 1);
    const count = countPerCol.get(c)!;
    return {
      id: nodeId(op.id),
      x: c * COL_X,
      y: (row - (count - 1) / 2) * ROW_Y,
    };
  });
}
