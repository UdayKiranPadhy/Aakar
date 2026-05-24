import type { Edge } from "@xyflow/react";

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
  if (isLayerStack(parent, children)) return buildLayerStackFlow(children);
  if (isDecoderLayer(parent, children)) return buildDecoderLayerFlow(parent, children);
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
  const attn = children.find(isAttention);
  const mlp = children.find(isMlp);
  if (!attn || !mlp) return null;

  const norms = children.filter(isNorm);
  const preNorm =
    children.find((node) => /(^|\.)(ln_1|input_layernorm)$/.test(node.id)) ?? norms[0];
  const postNorm =
    children.find((node) => /(^|\.)(ln_2|post_attention_layernorm)$/.test(node.id)) ??
    norms.find((node) => node.id !== preNorm?.id);

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

function buildAttentionFlow(
  parent: SpecNode,
  children: ReadonlyArray<SpecNode>,
): SemanticFlow | null {
  const q = findByName(children, "q_proj");
  const k = findByName(children, "k_proj");
  const v = findByName(children, "v_proj");
  const fused = findByName(children, "c_attn") ?? findByName(children, "in_proj");
  const out =
    findByName(children, "o_proj") ??
    findByName(children, "c_proj") ??
    findByName(children, "out_proj");
  if ((!q || !k || !v) && !fused) return null;

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
  const qNorm = findByName(children, "q_norm");
  const kNorm = findByName(children, "k_norm");
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
  const gate = findByName(children, "gate_proj");
  const up = findByName(children, "up_proj") ?? findByName(children, "c_fc");
  const down = findByName(children, "down_proj") ?? findByName(children, "c_proj");
  const act = children.find((node) => /act|gelu|silu/i.test(`${node.id} ${node.type}`));
  if (!up || !down) return null;

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

  const tail = children.find((node) => /dropout/i.test(node.type));
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

function isLayerStack(parent: SpecNode, children: ReadonlyArray<SpecNode>): boolean {
  return (
    parent.type === "module_list" &&
    children.length >= 4 &&
    children.every((node) => /^Layer \d+$/.test(node.label) || isDecoderLayer(node, node.children ?? []))
  );
}

function isDecoderLayer(parent: SpecNode, children: ReadonlyArray<SpecNode>): boolean {
  const type = `${parent.type} ${parent.module_class ?? ""}`.toLowerCase();
  const nameLooksRight = type.includes("decoder_layer") || /\b\w+_block\b/.test(type);
  return nameLooksRight && children.some(isAttention) && children.some(isMlp);
}

function isAttention(node: SpecNode): boolean {
  return `${node.type} ${node.module_class ?? ""} ${node.id}`.toLowerCase().includes("attention") ||
    /(^|\.)(attn|self_attn)$/.test(node.id);
}

function isMlp(node: SpecNode): boolean {
  return /mlp|feed_forward|ffn/.test(`${node.type} ${node.module_class ?? ""} ${node.id}`.toLowerCase());
}

function isNorm(node: SpecNode): boolean {
  return /norm/.test(`${node.type} ${node.module_class ?? ""} ${node.id}`.toLowerCase());
}

function findByName(children: ReadonlyArray<SpecNode>, name: string): SpecNode | undefined {
  return children.find((node) => node.id.endsWith(`.${name}`) || node.id === name);
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
