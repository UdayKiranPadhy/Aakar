/**
 * Token Journey derivation — pure domain logic, no React.
 *
 * Walks a `Spec` tree and produces an ordered, linear narrative of what happens
 * to a token: input ids → embedding → (positional) → N×(residual blocks of
 * norm → sub-layer) → final norm → lm_head → logits.
 *
 * Classification is STRUCTURAL — it trusts the backend's `category` (Python
 * namespace), `intermediates` (attention/MLP fingerprint), and config-derived
 * dimensions, never class-name string matching (see `moduleRoles`). Where a
 * module can't be fingerprinted, it's shown generically rather than guessed.
 *
 * The model runs on the meta device with no weights, so this is a SHAPE +
 * STRUCTURE narrative: tensor shapes and operations, never real values.
 */

import { isAttention, isLayerStack, isMlp, isMoe, isNorm } from "./moduleRoles";
import { findNodeByPath, type ExpansionPath } from "./navigation";
import type { Node, Spec } from "./spec";

export type JourneyStageKind =
  | "input-ids"
  | "embedding"
  | "pos-encoding"
  | "split"
  | "norm"
  | "attn"
  | "mlp"
  | "add"
  | "final-norm"
  | "lm-head"
  | "logits";

/** Which tensor axis changes across a stage — lets the connector highlight it. */
export type ChangedDim = Readonly<{ axis: number; from: string | null; to: string }>;

export type JourneyStage = Readonly<{
  /** Unique within a journey (node path joined, or a synthetic id). */
  id: string;
  kind: JourneyStageKind;
  label: string;
  caption: string;
  inputShape: string | null;
  outputShape: string | null;
  /** Set when the stage changes the shape (embedding, lm-head). */
  changedDim?: ChangedDim;
  /** Symbolic intermediates (attention q/k/v/attn_scores, MLP up), straight from the Node. */
  intermediates?: Readonly<Record<string, string>>;
  /** Root-to-node path for "See inside" deep-linking; absent for synthetic stages. */
  nodePath?: ExpansionPath;
  badges?: ReadonlyArray<string>;
  isMoe?: boolean;
  /** Structural step with no backing nn.Module (ids / split / add / logits / tied head). */
  isSynthetic?: boolean;
  /** For an `add` stage: the named inputs being summed, e.g. ["skip", "self_attn"]. */
  inputs?: ReadonlyArray<string>;
}>;

/** One pre-norm residual block: stream forks at `split`, runs `branch`, merges at `add`. */
export type ResidualBlock = Readonly<{
  split: JourneyStage;
  branch: ReadonlyArray<JourneyStage>; // [norm?, sub-layer]
  add: JourneyStage;
}>;

export type JourneyLayer = Readonly<{
  repeat: number;
  representativePath: ExpansionPath;
  blocks: ReadonlyArray<ResidualBlock>;
}>;

export type TokenJourney = Readonly<{
  modelId: string;
  preStages: ReadonlyArray<JourneyStage>; // input-ids, embedding, [pos-encoding]
  layer: JourneyLayer | null;
  postStages: ReadonlyArray<JourneyStage>; // final-norm, lm-head, logits
  positionEncoding: string | null;
}>;

export type JourneyResult =
  | { ok: true; journey: TokenJourney }
  | { ok: false; reason: string };

/** A stage flattened into the linear timeline the pulse/scrubber walk. */
export type FlatStage = JourneyStage & { group: "pre" | "layer" | "post" };

/** Flatten the grouped journey into one ordered list (for the pulse/scrubber). */
export function flattenJourney(j: TokenJourney): ReadonlyArray<FlatStage> {
  const out: FlatStage[] = [];
  for (const s of j.preStages) out.push({ ...s, group: "pre" });
  if (j.layer) {
    for (const b of j.layer.blocks) {
      out.push({ ...b.split, group: "layer" });
      for (const s of b.branch) out.push({ ...s, group: "layer" });
      out.push({ ...b.add, group: "layer" });
    }
  }
  for (const s of j.postStages) out.push({ ...s, group: "post" });
  return out;
}

// ─── derivation ──────────────────────────────────────────────────────────────

export function deriveTokenJourney(spec: Spec): JourneyResult {
  const root = spec.graph[0];
  if (!root) return { ok: false, reason: "Empty graph." };

  const summary = spec.config_summary;
  const hidden = numOf(summary, "hidden_size");
  const vocab = numOf(summary, "vocab_size");
  const numLayers = numOf(summary, "num_hidden_layers");
  const numHeads = numOf(summary, "num_attention_heads");
  const numKv = numOf(summary, "num_key_value_heads") ?? numHeads;
  const gqaRatio = numOf(summary, "gqa_ratio");
  const experts = numOf(summary, "num_local_experts");
  const topk = numOf(summary, "num_experts_per_tok");
  const posEnc = spec.position_encoding ?? null;

  const hiddenShape = hidden ? `[B, S, ${hidden}]` : "[B, S, H]";
  const vocabShape = vocab ? `[B, S, ${vocab}]` : "[B, S, V]";

  const ctx: BlockCtx = { hiddenShape, numHeads, numKv, gqaRatio, posEnc, experts, topk };

  const preStages: JourneyStage[] = [];

  // 1 — input ids (synthetic).
  preStages.push({
    id: "__ids",
    kind: "input-ids",
    label: "Token ids",
    caption: "A sequence of S integer ids — one per token, straight from the tokenizer.",
    inputShape: null,
    outputShape: "[B, S]",
    isSynthetic: true,
  });

  // 2 — embeddings (category "embedding", namespace-derived). Disambiguate the token table
  // from a positional table by config dims (num_embeddings == vocab vs max_position).
  const embeddings = findAll(spec.graph, (n) => n.category === "embedding");
  const tokenEmb = pickTokenEmbedding(embeddings, vocab);
  const positional = embeddings.find((e) => e !== tokenEmb);

  if (tokenEmb) {
    preStages.push({
      id: tokenEmb.path.join("/"),
      kind: "embedding",
      label: tokenEmb.node.label,
      caption: `Each token id looks up a learned ${hidden ?? "hidden"}-dim vector — the token becomes a point in embedding space.`,
      inputShape: "[B, S]",
      outputShape: tokenEmb.node.output_shape ?? hiddenShape,
      changedDim: { axis: 2, from: null, to: hidden ? String(hidden) : "H" },
      nodePath: tokenEmb.path,
    });
  }

  // 2b — positional encoding. A second embedding table is a learned positional/segment
  // embedding; a "sinusoidal" position encoding (from config) is a fixed signal. RoPE/ALiBi
  // are applied inside attention, so they're surfaced as a badge there, not a stage.
  if (positional) {
    preStages.push({
      id: positional.path.join("/"),
      kind: "pos-encoding",
      label: positional.node.label,
      caption: "Learned position vectors are added so the model knows token order.",
      inputShape: hiddenShape,
      outputShape: hiddenShape,
      nodePath: positional.path,
    });
  } else if (posEnc === "sinusoidal") {
    preStages.push({
      id: "__posenc",
      kind: "pos-encoding",
      label: "Positional encoding",
      caption: "Fixed sinusoidal position signals are added to the token vectors.",
      inputShape: hiddenShape,
      outputShape: hiddenShape,
      isSynthetic: true,
    });
  }

  // 3 — decoder layer stack → one representative layer, repeated.
  const stack = findFirst(spec.graph, (n) => isLayerStack(n));
  let layer: JourneyLayer | null = null;
  if (stack) {
    const representative = stack.node.children?.[0];
    if (representative) {
      const repPath: ExpansionPath = [...stack.path, representative.id];
      const blocks = buildResidualBlocks(representative, repPath, ctx);
      if (blocks.length > 0) {
        layer = {
          repeat: numLayers ?? stack.node.children?.length ?? 1,
          representativePath: repPath,
          blocks,
        };
      }
    }
  }

  const postStages: JourneyStage[] = [];

  // 4 — final norm (a norm sibling of the stack inside the backbone, by position).
  if (stack) {
    const backbonePath = stack.path.slice(0, -1);
    const backbone = backbonePath.length > 0 ? findNodeByPath(spec.graph, backbonePath) : root;
    const finalNorm = (backbone?.children ?? []).find((c) => isNorm(c));
    if (finalNorm) {
      postStages.push({
        id: [...backbonePath, finalNorm.id].join("/"),
        kind: "final-norm",
        label: finalNorm.label,
        caption: "A final normalization after the last decoder layer.",
        inputShape: hiddenShape,
        outputShape: hiddenShape,
        nodePath: [...backbonePath, finalNorm.id],
      });
    }
  }

  // 5 — lm_head: a `linear` whose output dimension is the vocabulary (structural).
  // Account for tied embeddings, where there's no separate head module.
  const lmHead = findFirst(spec.graph, (n) => looksLikeLmHead(n, vocab));
  if (lmHead) {
    postStages.push({
      id: lmHead.path.join("/"),
      kind: "lm-head",
      label: lmHead.node.label,
      caption: "Project every position to one score per vocabulary token.",
      inputShape: hiddenShape,
      outputShape: lmHead.node.output_shape ?? vocabShape,
      changedDim: { axis: 2, from: hidden ? String(hidden) : "H", to: vocab ? String(vocab) : "V" },
      nodePath: lmHead.path,
      ...(spec.tied_word_embeddings ? { badges: ["tied"] } : {}),
    });
  } else if (spec.tied_word_embeddings) {
    postStages.push({
      id: "__lmhead",
      kind: "lm-head",
      label: "LM head",
      caption: "Reuses the embedding matrix (weights are tied) to score every vocabulary token.",
      inputShape: hiddenShape,
      outputShape: vocabShape,
      changedDim: { axis: 2, from: hidden ? String(hidden) : "H", to: vocab ? String(vocab) : "V" },
      badges: ["tied"],
      isSynthetic: true,
    });
  }

  // 6 — logits (synthetic) — only when a head produces them.
  const hasHead = postStages.some((s) => s.kind === "lm-head");
  if (hasHead) {
    postStages.push({
      id: "__logits",
      kind: "logits",
      label: "Logits",
      caption:
        "A score (logit) for every vocabulary token, at every position → softmax picks the next token.",
      inputShape: vocabShape,
      outputShape: vocabShape,
      isSynthetic: true,
    });
  }

  const hasEmbedding = preStages.some((s) => s.kind === "embedding");
  if (!hasEmbedding && !layer && !hasHead) {
    return { ok: false, reason: "Could not recognize an embedding, layer stack, or LM head." };
  }

  return {
    ok: true,
    journey: { modelId: spec.model_id, preStages, layer, postStages, positionEncoding: posEnc },
  };
}

// ─── residual-block grouping ───────────────────────────────────────────────────

type BlockCtx = {
  hiddenShape: string;
  numHeads: number | null;
  numKv: number | null;
  gqaRatio: number | null;
  posEnc: string | null;
  experts: number | null;
  topk: number | null;
};

/**
 * Group a decoder layer's children into pre-norm residual blocks: a sub-layer
 * (attention/MLP, by `intermediates`) preceded by its norm forms one block
 * `{ split → [norm?, sub-layer] → add }`. Source order (what the canvas uses) is
 * the source of truth; anything that isn't a norm or sub-layer is skipped.
 */
function buildResidualBlocks(
  layerNode: Node,
  layerPath: ExpansionPath,
  ctx: BlockCtx,
): ResidualBlock[] {
  const kids = layerNode.children ?? [];
  // Sub-layers (attention, MLP/MoE) and norms, each in definition order. Pre-norm
  // transformers have one norm per sub-layer; pair them by index. Index-pairing is
  // robust to models that list the norms AFTER the sub-layers (e.g. gpt-oss lists
  // self_attn, mlp, input_layernorm, post_attention_layernorm) rather than interleaved.
  const subs = kids.filter((k) => isAttention(k) || isMlp(k));
  const norms = kids.filter(isNorm);
  return subs.map((sub, i) => makeResidualBlock(norms[i] ?? null, sub, layerPath, ctx));
}

function makeResidualBlock(
  norm: Node | null,
  sub: Node,
  layerPath: ExpansionPath,
  ctx: BlockCtx,
): ResidualBlock {
  const attn = isAttention(sub);
  // Whether *this* sub-layer is MoE is the backend's per-module fact — accurate even when a
  // model mixes dense and MoE layers (only some carry experts), unlike a config-wide flag.
  const moe = isMoe(sub);

  const split: JourneyStage = {
    id: `${sub.id}__split`,
    kind: "split",
    label: "split",
    caption: `The token splits into two parallel paths: a skip path carries it unchanged, while a transform path runs norm → ${attn ? "attention" : "the feed-forward network"}. Both stay ${ctx.hiddenShape}.`,
    inputShape: ctx.hiddenShape,
    outputShape: ctx.hiddenShape,
    isSynthetic: true,
  };

  const branch: JourneyStage[] = [];
  if (norm) {
    branch.push({
      id: [...layerPath, norm.id].join("/"),
      kind: "norm",
      label: norm.label,
      caption:
        "Transform path: normalize the activations so the sub-layer sees a stable scale. The skip copy is untouched.",
      inputShape: norm.input_shape ?? ctx.hiddenShape,
      outputShape: norm.output_shape ?? ctx.hiddenShape,
      nodePath: [...layerPath, norm.id],
    });
  }

  branch.push({
    id: [...layerPath, sub.id].join("/"),
    kind: attn ? "attn" : "mlp",
    label: sub.label,
    caption: attn
      ? "Transform path: tokens attend to each other — Q/K/V are split into heads, scores = QKᵀ/√d → softmax → weighted V."
      : moe
        ? "Transform path: a router sends each token to its top-k experts (Mixture-of-Experts), then combines their outputs."
        : "Transform path: per-token feature mixing — project up, apply the activation, project back down.",
    inputShape: sub.input_shape ?? ctx.hiddenShape,
    outputShape: sub.output_shape ?? ctx.hiddenShape,
    nodePath: [...layerPath, sub.id],
    ...(sub.intermediates ? { intermediates: sub.intermediates } : {}),
    ...(attn ? { badges: attnBadges(ctx) } : moe ? { badges: moeBadges(ctx), isMoe: true } : {}),
  });

  const add: JourneyStage = {
    id: `${sub.id}__add`,
    kind: "add",
    label: "merge",
    caption: `The two paths merge: the skip copy plus ${attn ? "attention" : "the feed-forward"} output are added — the residual connection. Shape is unchanged.`,
    inputShape: ctx.hiddenShape,
    outputShape: ctx.hiddenShape,
    inputs: ["skip", sub.label],
    isSynthetic: true,
  };

  return { split, branch, add };
}

function attnBadges(ctx: BlockCtx): string[] {
  const badges: string[] = [];
  if (ctx.numHeads && ctx.numKv && ctx.numKv < ctx.numHeads) {
    const ratio = ctx.gqaRatio ?? Math.round(ctx.numHeads / ctx.numKv);
    badges.push(`GQA ${ratio}:1`);
  } else if (ctx.numHeads) {
    badges.push("MHA");
  }
  if (ctx.posEnc === "rope") badges.push("RoPE");
  else if (ctx.posEnc === "alibi") badges.push("ALiBi");
  return badges;
}

function moeBadges(ctx: BlockCtx): string[] {
  if (!ctx.experts) return ["MoE"];
  return [`MoE · ${ctx.experts} experts${ctx.topk ? ` (top-${ctx.topk})` : ""}`];
}

// ─── tree helpers ──────────────────────────────────────────────────────────────

type Found = { node: Node; path: ExpansionPath };

function findFirst(
  nodes: ReadonlyArray<Node>,
  pred: (n: Node) => boolean,
  parentPath: ExpansionPath = [],
): Found | null {
  for (const n of nodes) {
    const path: ExpansionPath = [...parentPath, n.id];
    if (pred(n)) return { node: n, path };
    if (n.children) {
      const found = findFirst(n.children, pred, path);
      if (found) return found;
    }
  }
  return null;
}

function findAll(
  nodes: ReadonlyArray<Node>,
  pred: (n: Node) => boolean,
  parentPath: ExpansionPath = [],
): Found[] {
  const out: Found[] = [];
  for (const n of nodes) {
    const path: ExpansionPath = [...parentPath, n.id];
    if (pred(n)) out.push({ node: n, path });
    if (n.children) out.push(...findAll(n.children, pred, path));
  }
  return out;
}

/**
 * The token-embedding table among possibly several embeddings: the one whose
 * `num_embeddings` equals the vocabulary (config). Falls back to the largest
 * table (the vocabulary vastly exceeds the position count), then to the first.
 */
function pickTokenEmbedding(embeddings: Found[], vocab: number | null): Found | undefined {
  if (embeddings.length === 0) return undefined;
  if (vocab != null) {
    const exact = embeddings.find((e) => paramNum(e.node, "num_embeddings") === vocab);
    if (exact) return exact;
  }
  return [...embeddings].sort(
    (a, b) => (paramNum(b.node, "num_embeddings") ?? 0) - (paramNum(a.node, "num_embeddings") ?? 0),
  )[0];
}

/** A linear projection to the vocabulary: structural (output/weight dim == vocab_size). */
function looksLikeLmHead(n: Node, vocab: number | null): boolean {
  if (n.category !== "linear") return false;
  if (vocab == null) return false;
  if (n.weight_shape && n.weight_shape.includes(vocab)) return true;
  if (n.output_shape && n.output_shape.includes(String(vocab))) return true;
  return false;
}

function paramNum(n: Node, key: string): number | null {
  const v = n.params[key];
  return typeof v === "number" ? v : null;
}

function numOf(
  summary: Readonly<Record<string, string | number | boolean | object>>,
  key: string,
): number | null {
  const v = summary[key];
  return typeof v === "number" ? v : null;
}
