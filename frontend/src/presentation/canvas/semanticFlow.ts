import type { Edge } from "@xyflow/react";

import {
  isAttention,
  isDecoderLayer,
  isLayerStack,
  isMlp,
  isNorm,
} from "../../domain/moduleRoles";
import type { Node as SpecNode } from "../../domain/spec";
import type {
  BlockVisualTone,
  BlockVisualVariant,
} from "../blocks/BlockRegistry";
import type { LayoutPosition } from "../layout/LayoutRegistry";
import { makeEdge, makeFlowEdge, makeResidualEdge } from "./edges";

const SYNTHETIC_PREFIX = "__flow__";

export type SemanticFlow = {
  nodes: ReadonlyArray<SpecNode>;
  positions: ReadonlyArray<LayoutPosition>;
  edges: ReadonlyArray<Edge>;
  variants: ReadonlyMap<string, BlockVisualVariant>;
  tones: ReadonlyMap<string, BlockVisualTone>;
  fitViewOptions: { padding: number; maxZoom: number; minZoom?: number };
};

export function isSyntheticNode(node: SpecNode): boolean {
  return node.id.startsWith(SYNTHETIC_PREFIX);
}

export function buildSemanticFlow(
  parent: SpecNode | null,
  children: ReadonlyArray<SpecNode>,
): SemanticFlow | null {
  if (!parent || children.length === 0) return null;
  if (isLayerStack(parent)) return buildLayerStackFlow(children);
  if (isDecoderLayer(children)) return buildDecoderLayerFlow(parent, children);
  if (isAttention(parent)) return buildAttentionFlow(parent, children);
  if (isMlp(parent)) return buildMlpFlow(parent, children);
  return null;
}

function buildLayerStackFlow(children: ReadonlyArray<SpecNode>): SemanticFlow {
  const cols = children.length > 20 ? 5 : 4;
  const positions = children.map((node, index) => ({
    id: node.id,
    x: (index % cols) * 190,
    y: Math.floor(index / cols) * 116,
  }));

  return {
    nodes: children,
    positions,
    edges: sequentialFlowEdges(children),
    variants: mapAll(children, "layer-cell"),
    tones: new Map(children.map((node) => [node.id, "attention" as const])),
    fitViewOptions: { padding: 0.18, maxZoom: 1, minZoom: 0.58 },
  };
}

function buildDecoderLayerFlow(
  parent: SpecNode,
  children: ReadonlyArray<SpecNode>,
): SemanticFlow | null {
  // Roles are mutually exclusive facts from the backend: the attention sub-layer is the
  // child tagged `attention`, the FFN is the child tagged `mlp`/`moe`. A module is never
  // both, so a child can't fill both slots (the old bug where an attention block nesting a
  // gated projection got picked as the MLP).
  const attn = children.find(isAttention);
  const mlp = children.find(isMlp);
  if (!attn || !mlp) return null;

  // Pre- vs post-norm by position: `named_children()` preserves definition order,
  // so the first norm is the pre-norm and the next distinct one is the post-norm.
  // (No reliance on `input_layernorm`/`ln_1` naming.)
  const norms = children.filter(isNorm);
  const preNorm = norms[0];
  const postNorm = norms.find((node) => node.id !== preNorm?.id);

  const input = syntheticNode(parent, "input", "flow_input", "Input", parent.input_shape);
  const attnAdd = syntheticNode(
    parent,
    "attn_residual",
    "flow_residual",
    "+ residual",
    "attention skip",
  );
  const mlpAdd = syntheticNode(
    parent,
    "mlp_residual",
    "flow_residual",
    "+ residual",
    "MLP skip",
  );

  const nodes = compact([input, preNorm, attn, attnAdd, postNorm, mlp, mlpAdd]);
  // Generic block cards are 260px wide; stride 300 gives a 40px gap between
  // adjacent real cards so they don't visually butt up against each other.
  // Synthetic glyphs (Input, + residual) sit in the in-between columns and
  // are offset on the Y axis so the previous/next-block context callouts
  // (anchored CONTEXT_Y_OFFSET=180 above/below the first/last node) stay
  // clearly above the row of real cards.
  const positions = positionByOrder(nodes, (node, index) => ({
    id: node.id,
    x: index * 300,
    y: isSyntheticNode(node) ? 136 : 44,
  }));
  const tones = new Map<string, BlockVisualTone>([
    [input.id, "io"],
    [attn.id, "attention"],
    [attnAdd.id, "residual"],
    [mlp.id, "mlp"],
    [mlpAdd.id, "residual"],
  ]);
  for (const node of norms) tones.set(node.id, "norm");

  return {
    nodes,
    positions,
    edges: [
      ...sequentialFlowEdges(nodes),
      makeResidualEdge(input, attnAdd),
      makeResidualEdge(attnAdd, mlpAdd),
    ],
    variants: mapSynthetic(nodes),
    tones,
    fitViewOptions: { padding: 0.22, maxZoom: 1 },
  };
}

/** Trailing numeric dimension of a symbolic shape: "[B, S, 4096]" → 4096, "[B, 4, S, 8]" → 8. */
function lastNumericDim(shape?: string): number | null {
  const nums = shape?.match(/\d+/g);
  return nums && nums.length > 0 ? Number(nums[nums.length - 1]) : null;
}

/** A projection's output / input feature width, from its symbolic I/O shape (a backend fact). */
function outWidth(node: SpecNode): number | null {
  return lastNumericDim(node.output_shape);
}
function inWidth(node: SpecNode): number | null {
  return lastNumericDim(node.input_shape);
}

/**
 * Query and key/value head widths, read off the attention node's `intermediates` (q is
 * "[B, nH, S, hd]", k is "[B, nKV, S, hd]") — the backend's config-derived facts. These let
 * us identify the q / kv / output projections among the children by *shape*, never by name.
 */
function headWidths(attn: SpecNode): { qd: number; kvd: number } | null {
  const q = attn.intermediates?.q?.match(/\d+/g);
  if (!q || q.length < 2) return null;
  const qd = Number(q[0]) * Number(q[1]);
  const k = attn.intermediates?.k?.match(/\d+/g);
  const kvd = k && k.length >= 2 ? Number(k[0]) * Number(k[1]) : qd;
  return { qd, kvd };
}

/** FFN intermediate width, from the MLP node's `intermediates.up` ("[B, S, I]"). */
function ffnWidth(mlp: SpecNode): number | null {
  return lastNumericDim(mlp.intermediates?.up);
}

/**
 * Identify the q / kv / output / fused projections among an attention block's children by
 * matching their feature widths against the head widths — no `q_proj`/`k_proj` name lookup.
 * Key and value share a width, so they're taken in definition order (a structural fact); for
 * MHA, where query and kv widths coincide, the first three matching projections are q/k/v.
 */
function attnProjections(
  parent: SpecNode,
  children: ReadonlyArray<SpecNode>,
): { q?: SpecNode; k?: SpecNode; v?: SpecNode; out?: SpecNode; fused?: SpecNode } | null {
  const hw = headWidths(parent);
  if (!hw) return null;
  const { qd, kvd } = hw;
  const fused = children.find((c) => outWidth(c) === qd + 2 * kvd);
  if (fused) {
    const out = children.find((c) => c !== fused && inWidth(c) === qd);
    return { fused, out };
  }
  const qWidth = children.filter((c) => outWidth(c) === qd);
  if (qWidth.length === 0) return null;
  // The query projection maps hidden → qd, so its input width is the model hidden size.
  const hidden = inWidth(qWidth[0]!);
  // The output projection consumes the head space (in == qd) and restores hidden. When
  // qd == hidden it's shape-identical to the query, so it's the *other* qd-width projection.
  const out = children.find(
    (c) => c !== qWidth[0]! && inWidth(c) === qd && (hidden == null || outWidth(c) === hidden),
  );
  if (qd === kvd) {
    // MHA: q/k/v (and o) all share the width — only definition order separates them.
    const ordered = out ? qWidth.filter((c) => c !== out) : qWidth.slice(0, 3);
    const tail = !out && qWidth.length >= 4 ? qWidth[qWidth.length - 1] : out;
    const qkv = ordered.slice(0, 3);
    return qkv.length === 3 ? { q: qkv[0], k: qkv[1], v: qkv[2], out: tail } : null;
  }
  const q = qWidth.find((c) => c !== out);
  const kv = children.filter((c) => outWidth(c) === kvd);
  if (!q || kv.length === 0) return null;
  return { q, k: kv[0], v: kv[1] ?? kv[0], out };
}

function buildAttentionFlow(
  parent: SpecNode,
  children: ReadonlyArray<SpecNode>,
): SemanticFlow | null {
  const proj = attnProjections(parent, children);
  if (!proj) return null;
  const { q, k, v, fused, out } = proj;

  const qNode = q ?? syntheticNode(parent, "q", "attention_heads", "Q heads", metaFor(parent, "q"));
  const kNode = k ?? syntheticNode(parent, "k", "attention_heads", "K heads", metaFor(parent, "k"));
  const vNode = v ?? syntheticNode(parent, "v", "attention_heads", "V heads", metaFor(parent, "v"));
  const qHeads = q
    ? syntheticNode(parent, "q_heads", "attention_heads", "Q heads", metaFor(parent, "q"))
    : qNode;
  const kHeads = k
    ? syntheticNode(parent, "k_heads", "attention_heads", "K heads", metaFor(parent, "k"))
    : kNode;
  const vHeads = v
    ? syntheticNode(parent, "v_heads", "attention_heads", "V heads", metaFor(parent, "v"))
    : vNode;
  // Per-head norms (e.g. QK-norm): the norm-role children, in definition order.
  const headNorms = children.filter(isNorm);
  const qNorm = q ? headNorms[0] : undefined;
  const kNorm = q ? headNorms[1] : undefined;
  const scores = syntheticNode(
    parent,
    "scores",
    "attention_scores",
    "Scores",
    metaFor(parent, "attn_scores") ?? "QK^T / sqrt(d)",
  );
  const softmax = syntheticNode(parent, "softmax", "attention_softmax", "Softmax", "mask + normalize");
  const mix = syntheticNode(parent, "mix", "attention_mix", "Weighted V", "context");

  const nodes = fused
    ? compact([fused, qNode, kNode, vNode, scores, softmax, mix, out])
    : compact([qNode, qNorm, qHeads, kNode, kNorm, kHeads, vNode, vHeads, scores, softmax, mix, out]);
  const positions = attentionPositions(nodes, {
    q: qNode.id,
    k: kNode.id,
    v: vNode.id,
    qHeads: qHeads.id,
    kHeads: kHeads.id,
    vHeads: vHeads.id,
    qNorm: qNorm?.id,
    kNorm: kNorm?.id,
    scores: scores.id,
    softmax: softmax.id,
    mix: mix.id,
    out: out?.id,
    fused: fused?.id,
  });

  return {
    nodes,
    positions,
    edges: attentionEdges({
      qNode,
      kNode,
      vNode,
      qHeads,
      kHeads,
      vHeads,
      qNorm,
      kNorm,
      scores,
      softmax,
      mix,
      out,
      fused,
    }),
    variants: mapSynthetic(nodes),
    tones: toneAttention(nodes, scores.id, softmax.id, mix.id),
    fitViewOptions: { padding: 0.2, maxZoom: 1 },
  };
}

function buildMlpFlow(
  parent: SpecNode,
  children: ReadonlyArray<SpecNode>,
): SemanticFlow | null {
  // Identify the FFN projections by width: gate/up expand H → I (out == intermediate),
  // down contracts I → H (in == intermediate). No gate_proj/up_proj name lookup. Gate and up
  // share a width, so a gated MLP simply has two intermediate-width projections.
  const ffn = ffnWidth(parent);
  if (!ffn) return null;
  const expand = children.filter((node) => outWidth(node) === ffn);
  const down = children.find((node) => inWidth(node) === ffn);
  const act = children.find((node) => node.category === "activation");
  if (expand.length === 0 || !down) return null;
  // Gate and up share the intermediate width, so they're taken in definition order: the
  // gated SwiGLU convention is gate (→ activation) first, then up (→ the elementwise product).
  const gate = expand.length >= 2 ? expand[0] : undefined;
  const up = expand.length >= 2 ? expand[1]! : expand[0]!;

  if (gate) {
    const multiply = syntheticNode(
      parent,
      "multiply",
      "mlp_multiply",
      "Gate × up",
      metaFor(parent, "up") ?? "elementwise product",
    );
    const nodes = compact([gate, act, up, multiply, down]);
    const positions = mlpPositions(nodes, {
      gate: gate.id,
      act: act?.id,
      up: up.id,
      multiply: multiply.id,
      down: down.id,
    });
    return {
      nodes,
      positions,
      edges: compact([
        makeFlowEdge(gate, act ?? multiply),
        act ? makeFlowEdge(act, multiply) : null,
        makeFlowEdge(up, multiply),
        makeFlowEdge(multiply, down),
      ]),
      variants: mapSynthetic(nodes),
      tones: toneMlp(nodes, multiply.id),
      fitViewOptions: { padding: 0.24, maxZoom: 1 },
    };
  }

  const tail = children.find((node) => node.category === "dropout");
  const nodes = compact([up, act, down, tail]);
  return {
    nodes,
    positions: positionByOrder(nodes, (node, index) => ({
      id: node.id,
      x: index * 250,
      y: 80,
    })),
    edges: sequentialFlowEdges(nodes),
    variants: new Map(),
    tones: toneMlp(nodes),
    fitViewOptions: { padding: 0.24, maxZoom: 1 },
  };
}

function syntheticNode(
  parent: SpecNode,
  suffix: string,
  type: string,
  label: string,
  meta?: string | null,
): SpecNode {
  return {
    id: `${SYNTHETIC_PREFIX}${parent.id}.${suffix}`,
    type,
    label,
    meta: meta ?? undefined,
    params: {},
  };
}

function metaFor(parent: SpecNode, key: string): string | null {
  return parent.intermediates?.[key] ?? null;
}

function sequentialFlowEdges(nodes: ReadonlyArray<SpecNode>): Edge[] {
  const edges: Edge[] = [];
  for (let index = 0; index < nodes.length - 1; index++) {
    const source = nodes[index];
    const target = nodes[index + 1];
    if (source && target) edges.push(makeFlowEdge(source, target));
  }
  return edges;
}

function attentionEdges({
  qNode,
  kNode,
  vNode,
  qHeads,
  kHeads,
  vHeads,
  qNorm,
  kNorm,
  scores,
  softmax,
  mix,
  out,
  fused,
}: {
  qNode: SpecNode;
  kNode: SpecNode;
  vNode: SpecNode;
  qHeads: SpecNode;
  kHeads: SpecNode;
  vHeads: SpecNode;
  qNorm?: SpecNode;
  kNorm?: SpecNode;
  scores: SpecNode;
  softmax: SpecNode;
  mix: SpecNode;
  out?: SpecNode;
  fused?: SpecNode;
}): Edge[] {
  return compact([
    fused ? makeEdge(fused, qNode) : null,
    fused ? makeEdge(fused, kNode) : null,
    fused ? makeEdge(fused, vNode) : null,
    qNode.id === (qNorm ?? qHeads).id ? null : makeFlowEdge(qNode, qNorm ?? qHeads),
    qNorm ? makeFlowEdge(qNorm, qHeads) : null,
    makeFlowEdge(qHeads, scores),
    kNode.id === (kNorm ?? kHeads).id ? null : makeFlowEdge(kNode, kNorm ?? kHeads),
    kNorm ? makeFlowEdge(kNorm, kHeads) : null,
    makeFlowEdge(kHeads, scores),
    makeFlowEdge(scores, softmax),
    makeFlowEdge(softmax, mix),
    vNode.id === vHeads.id ? null : makeFlowEdge(vNode, vHeads),
    makeFlowEdge(vHeads, mix),
    out ? makeFlowEdge(mix, out) : null,
  ]);
}

function attentionPositions(
  nodes: ReadonlyArray<SpecNode>,
  ids: {
    q: string;
    k: string;
    v: string;
    qHeads: string;
    kHeads: string;
    vHeads: string;
    qNorm?: string;
    kNorm?: string;
    scores: string;
    softmax: string;
    mix: string;
    out?: string;
    fused?: string;
  },
): LayoutPosition[] {
  // Row stride sized for the tallest card in a Q/K/V row — a Linear with
  // matrix-glyph + I/O shapes + weight shape + params/memory + flops can hit
  // ~180px. Anything tighter (the previous 136) stacked the projections on
  // top of each other.
  const ROW_Y = 240;
  // X strides between major columns. Each Generic block card is 260px wide,
  // so leave at least a 30px gap between adjacent columns.
  const PROJ_TO_NORM_X = 300;
  const NORM_TO_HEADS_X = 280;
  const PROJ_TO_HEADS_X = 300;
  // The compact attention_heads glyph is 132px wide; scores/softmax/mix use
  // the same FlowGlyph renderer, so 200px stride leaves a clean ~70px gap.
  const HEADS_TO_SCORES_X = 220;
  const SCORES_TO_SOFTMAX_X = 200;
  const SOFTMAX_TO_MIX_X = 220;
  const MIX_TO_OUT_X = 240;

  const positions = new Map<string, { x: number; y: number }>();
  if (ids.fused) positions.set(ids.fused, { x: 0, y: ROW_Y });
  const branchX = ids.fused ? 280 : 0;
  positions.set(ids.q, { x: branchX, y: 0 });
  positions.set(ids.k, { x: branchX, y: ROW_Y });
  positions.set(ids.v, { x: branchX, y: ROW_Y * 2 });
  if (ids.qNorm) positions.set(ids.qNorm, { x: branchX + PROJ_TO_NORM_X, y: 0 });
  if (ids.kNorm) positions.set(ids.kNorm, { x: branchX + PROJ_TO_NORM_X, y: ROW_Y });
  const headsX =
    branchX + (ids.qNorm || ids.kNorm ? PROJ_TO_NORM_X + NORM_TO_HEADS_X : PROJ_TO_HEADS_X);
  positions.set(ids.qHeads, { x: headsX, y: 0 });
  positions.set(ids.kHeads, { x: headsX, y: ROW_Y });
  positions.set(ids.vHeads, { x: headsX, y: ROW_Y * 2 });
  // Scores / softmax sit centered between the Q-heads and K-heads rows.
  // Mix sits centered between the K-heads and V-heads rows (where it
  // pulls inputs from softmax above and V-heads below).
  const scoreX = headsX + HEADS_TO_SCORES_X;
  const scoreY = ROW_Y / 2;
  const mixY = ROW_Y + ROW_Y / 2;
  positions.set(ids.scores, { x: scoreX, y: scoreY });
  positions.set(ids.softmax, { x: scoreX + SCORES_TO_SOFTMAX_X, y: scoreY });
  positions.set(ids.mix, { x: scoreX + SCORES_TO_SOFTMAX_X + SOFTMAX_TO_MIX_X, y: mixY });
  if (ids.out)
    positions.set(ids.out, {
      x: scoreX + SCORES_TO_SOFTMAX_X + SOFTMAX_TO_MIX_X + MIX_TO_OUT_X,
      y: mixY,
    });
  return nodes.map((node, index) => ({
    id: node.id,
    ...(positions.get(node.id) ?? { x: index * 240, y: 0 }),
  }));
}

function mlpPositions(
  nodes: ReadonlyArray<SpecNode>,
  ids: { gate: string; act?: string; up: string; multiply: string; down: string },
): LayoutPosition[] {
  const positions = new Map<string, { x: number; y: number }>([
    [ids.gate, { x: 0, y: 0 }],
    [ids.up, { x: 0, y: 160 }],
    [ids.multiply, { x: 520, y: 80 }],
    [ids.down, { x: 740, y: 80 }],
  ]);
  if (ids.act) positions.set(ids.act, { x: 280, y: 0 });
  return nodes.map((node) => ({ id: node.id, ...(positions.get(node.id) ?? { x: 0, y: 0 }) }));
}

function positionByOrder(
  nodes: ReadonlyArray<SpecNode>,
  fn: (node: SpecNode, index: number) => LayoutPosition,
): LayoutPosition[] {
  return nodes.map(fn);
}

function mapAll(
  nodes: ReadonlyArray<SpecNode>,
  variant: BlockVisualVariant,
): ReadonlyMap<string, BlockVisualVariant> {
  return new Map(nodes.map((node) => [node.id, variant]));
}

function mapSynthetic(nodes: ReadonlyArray<SpecNode>): ReadonlyMap<string, BlockVisualVariant> {
  return new Map(
    nodes
      .filter(isSyntheticNode)
      .map((node) => [node.id, "flow-glyph" as const]),
  );
}

function toneAttention(
  nodes: ReadonlyArray<SpecNode>,
  scoresId: string,
  softmaxId: string,
  mixId: string,
): ReadonlyMap<string, BlockVisualTone> {
  return new Map(
    nodes.map((node) => [
      node.id,
      node.id === scoresId || node.id === softmaxId || node.id === mixId
        ? "attention"
        : isNorm(node)
          ? "norm"
          : "matrix",
    ]),
  );
}

function toneMlp(
  nodes: ReadonlyArray<SpecNode>,
  multiplyId?: string,
): ReadonlyMap<string, BlockVisualTone> {
  return new Map(
    nodes.map((node) => [
      node.id,
      node.id === multiplyId ? "mlp" : isSyntheticNode(node) ? "residual" : "mlp",
    ]),
  );
}

function compact<T>(items: ReadonlyArray<T | null | undefined>): T[] {
  return items.filter((item): item is T => item != null);
}
