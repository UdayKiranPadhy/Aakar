/**
 * Pure helpers for the Parameters and Compute views (no React).
 *
 * The "top-level components" of a model are the root's children, with the
 * dominant backbone container expanded one level so embeddings / the layer
 * stack / final norm / lm_head appear as separate rows. This is generic — it
 * keys off param share, never on family-specific names.
 */

import type { Node } from "../../../domain/spec";

const BACKBONE_SHARE = 0.4;

export function topLevelComponents(graph: ReadonlyArray<Node>): ReadonlyArray<Node> {
  const root = graph[0];
  if (!root) return [];
  const children = root.children ?? [];
  if (children.length === 0) return [root];

  const total = root.param_count ?? 0;
  const out: Node[] = [];
  for (const child of children) {
    const grandchildren = child.children ?? [];
    const isDominantBackbone =
      total > 0 && grandchildren.length >= 2 && (child.param_count ?? 0) > total * BACKBONE_SHARE;
    if (isDominantBackbone) {
      out.push(...grandchildren);
    } else {
      out.push(child);
    }
  }
  return out;
}

/** Recursive sum of per-node FLOPs over a subtree (`node.flops` is not recursive). */
export function sumFlops(node: Node): number {
  let total = node.flops ?? 0;
  for (const child of node.children ?? []) total += sumFlops(child);
  return total;
}

/** Leaf modules that carry a weight tensor (for the "largest tensors" list). */
export function collectLeafTensors(graph: ReadonlyArray<Node>): ReadonlyArray<Node> {
  const out: Node[] = [];
  const walk = (nodes: ReadonlyArray<Node>): void => {
    for (const node of nodes) {
      const kids = node.children ?? [];
      if (kids.length === 0) {
        if (node.weight_shape && (node.param_count ?? 0) > 0) out.push(node);
      } else {
        walk(kids);
      }
    }
  };
  walk(graph);
  return out;
}

export type ParamTotal = Readonly<{ total: number; source: "safetensors" | "introspected" }>;

/** Prefer the Hub's exact safetensors total; else the introspected (meta) sum. */
export function reconcileParamTotal(
  introspected: number,
  safetensorsTotal: number | undefined,
): ParamTotal {
  if (typeof safetensorsTotal === "number" && safetensorsTotal > 0) {
    return { total: safetensorsTotal, source: "safetensors" };
  }
  return { total: introspected, source: "introspected" };
}

/**
 * Scale a FLOPs figure computed at `ref` dims to a target (batch, seq). Linear,
 * MLP and norm FLOPs are linear in the token count (batch × seq).
 */
export function scaleFlops(
  flopsAtRef: number,
  ref: Readonly<{ batch_size: number; seq_len: number }>,
  target: Readonly<{ batch: number; seq: number }>,
): number {
  const refTokens = ref.batch_size * ref.seq_len;
  if (refTokens <= 0) return flopsAtRef;
  return (flopsAtRef * (target.batch * target.seq)) / refTokens;
}
