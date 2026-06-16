/**
 * Pure engineering math for the Compare page's derived calculators. Every value
 * is computed from config fields (or introspected FLOPs) — nothing is hardcoded.
 * Any missing input yields `undefined`, which the UI renders as an em-dash.
 */

import type { Spec } from "../../../domain/spec";
import { scaleFlops, sumFlops } from "../../model-views/shared/breakdown";

type Summary = Spec["config_summary"];

function num(summary: Summary, key: string): number | undefined {
  const value = (summary as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

/** Read a numeric config_summary field, or undefined when absent/non-numeric. */
export function summaryNumber(summary: Summary, key: string): number | undefined {
  return num(summary, key);
}

/**
 * Effective KV-head count for memory math: the explicit `num_key_value_heads`,
 * else `num_attention_heads`. Multi-head attention has one KV head per query
 * head by definition, and stock `transformers` defaults it that way — so this is
 * the real value, not a guess.
 */
export function kvHeads(summary: Summary): number | undefined {
  return num(summary, "num_key_value_heads") ?? num(summary, "num_attention_heads");
}

/** head_dim from config; else hidden_size / num_attention_heads; else undefined. */
export function headDim(summary: Summary): number | undefined {
  const explicit = num(summary, "head_dim");
  if (explicit !== undefined) return explicit;
  const hidden = num(summary, "hidden_size");
  const heads = num(summary, "num_attention_heads");
  if (hidden !== undefined && heads !== undefined && heads > 0) return hidden / heads;
  return undefined;
}

/** Total parameter count: the curated summary value, else the root node's count. */
export function totalParams(spec: Spec): number | undefined {
  return num(spec.config_summary, "total_params") ?? spec.graph[0]?.param_count ?? undefined;
}

export function weightsBytes(
  params: number | undefined,
  bytesPerElem: number | undefined,
): number | undefined {
  if (params === undefined || bytesPerElem === undefined) return undefined;
  return params * bytesPerElem;
}

/** KV-cache bytes: 2 (key+value) × layers × kv-heads × head-dim × batch × seq × bytes. */
export function kvCacheBytes(p: {
  numLayers?: number;
  numKvHeads?: number;
  headDim?: number;
  batch: number;
  seq: number;
  bytesPerElem?: number;
}): number | undefined {
  const { numLayers, numKvHeads, headDim: hd, batch, seq, bytesPerElem } = p;
  if (
    numLayers === undefined ||
    numKvHeads === undefined ||
    hd === undefined ||
    bytesPerElem === undefined
  ) {
    return undefined;
  }
  return 2 * numLayers * numKvHeads * hd * batch * seq * bytesPerElem;
}

/** Introspected forward FLOPs scaled to (batch, seq); undefined when unavailable. */
export function flopsAt(spec: Spec, batch: number, seq: number): number | undefined {
  const root = spec.graph[0];
  if (!root) return undefined;
  const atRef = sumFlops(root);
  if (atRef <= 0) return undefined;
  const ref = spec.flops_reference ?? { batch_size: 1, seq_len: 2048 };
  return scaleFlops(atRef, ref, { batch, seq });
}

export function arithmeticIntensity(
  flops: number | undefined,
  bytesMoved: number | undefined,
): number | undefined {
  if (flops === undefined || bytesMoved === undefined || bytesMoved <= 0) return undefined;
  return flops / bytesMoved;
}

export type VramResult = Readonly<{ weights?: number; kv?: number; total?: number }>;

/** Weights, KV-cache, and total footprint for a spec at the given (batch, seq, dtype). */
export function vramFor(
  spec: Spec,
  inputs: { batch: number; seq: number; bytesPerElem: number | undefined },
): VramResult {
  const { batch, seq, bytesPerElem } = inputs;
  const weights = weightsBytes(totalParams(spec), bytesPerElem);
  const kv = kvCacheBytes({
    numLayers: num(spec.config_summary, "num_hidden_layers"),
    numKvHeads: kvHeads(spec.config_summary),
    headDim: headDim(spec.config_summary),
    batch,
    seq,
    bytesPerElem,
  });
  const total = weights !== undefined && kv !== undefined ? weights + kv : undefined;
  return { weights, kv, total };
}

export type AttentionRegime = "MHA" | "GQA" | "MQA" | "—";

/**
 * Attention regime from head counts (per spec-contract semantics): KV heads
 * equal to (or absent ⇒ defaulting to) the query heads is multi-head; a single
 * KV head is multi-query; anything in between is grouped-query.
 */
export function attentionRegime(summary: Summary): AttentionRegime {
  const heads = num(summary, "num_attention_heads");
  if (heads === undefined) return "—";
  const kv = num(summary, "num_key_value_heads");
  if (kv === undefined || kv === heads) return "MHA";
  if (kv === 1) return "MQA";
  return "GQA";
}
