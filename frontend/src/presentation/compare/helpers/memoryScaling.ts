/**
 * Pure: compute total-VRAM-vs-sequence-length curves for the scaling chart. The
 * x-axis range is derived from the models' declared context windows (never a
 * fixed constant), and a model whose footprint can't be computed is omitted.
 */

import type { Spec } from "../../../domain/spec";
import { headDim, kvCacheBytes, kvHeads, totalParams, weightsBytes } from "./engineering";

export type ChartPoint = Readonly<{ seq: number; bytes: number }>;
export type ChartSeries = Readonly<{ modelId: string; points: ReadonlyArray<ChartPoint> }>;

export type ScalingResult = Readonly<{
  series: ReadonlyArray<ChartSeries>;
  /** Number of input models that couldn't be plotted (insufficient config). */
  omitted: number;
  seqMax: number;
  bytesMax: number;
}>;

type Options = Readonly<{
  batch: number;
  bytesPerElem: (spec: Spec) => number | undefined;
  steps: number;
  seqMax?: number;
}>;

function num(summary: Spec["config_summary"], key: string): number | undefined {
  const value = (summary as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

/** Largest declared context window across the models; falls back to the FLOPs ref seq. */
export function deriveSeqMax(specs: ReadonlyArray<Spec>): number {
  let max = 0;
  for (const spec of specs) {
    const ctx = num(spec.config_summary, "max_position_embeddings");
    if (ctx !== undefined && ctx > max) max = ctx;
  }
  if (max <= 0) {
    for (const spec of specs) {
      const ref = spec.flops_reference?.seq_len ?? 0;
      if (ref > max) max = ref;
    }
  }
  return max > 0 ? max : 2048; // last-resort axis floor when no model declares one
}

export function memoryScalingSeries(
  specs: ReadonlyArray<Spec>,
  opts: Options,
): ScalingResult {
  const seqMax = opts.seqMax ?? deriveSeqMax(specs);
  const steps = Math.max(2, Math.floor(opts.steps));
  const seqs: number[] = [];
  for (let i = 0; i < steps; i++) {
    // Evenly spaced over (0, seqMax]; skip seq=0 (flat-zero KV term).
    seqs.push(Math.max(1, Math.round((seqMax * (i + 1)) / steps)));
  }

  const series: ChartSeries[] = [];
  let bytesMax = 0;
  let omitted = 0;

  for (const spec of specs) {
    const bytesPerElem = opts.bytesPerElem(spec);
    const weights = weightsBytes(totalParams(spec), bytesPerElem);
    const numLayers = num(spec.config_summary, "num_hidden_layers");
    const numKvHeads = kvHeads(spec.config_summary);
    const hd = headDim(spec.config_summary);

    const points: ChartPoint[] = [];
    let computable = weights !== undefined;
    if (computable) {
      for (const seq of seqs) {
        const kv = kvCacheBytes({ numLayers, numKvHeads, headDim: hd, batch: opts.batch, seq, bytesPerElem });
        if (weights === undefined || kv === undefined) {
          computable = false;
          break;
        }
        const bytes = weights + kv;
        if (bytes > bytesMax) bytesMax = bytes;
        points.push({ seq, bytes });
      }
    }

    if (computable) series.push({ modelId: spec.model_id, points });
    else omitted += 1;
  }

  return { series, omitted, seqMax, bytesMax };
}
