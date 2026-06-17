/** Shared calculator inputs threaded from CompareHost into the derived sections. */

import type { Spec } from "../../domain/spec";

export type CalcInputs = Readonly<{
  batch: number;
  seq: number;
  /** Bytes-per-element to use for a model (selected precision, or its native dtype). */
  bytesFor: (spec: Spec) => number | undefined;
}>;

/**
 * The full calculator context the CompareHost owns and threads to the Compute
 * tab via the registry prop: the derived `CalcInputs` plus the raw controls the
 * VRAM section's sliders / precision picker need. Bundled so the prop carries
 * one object; only the Compute tab reads it.
 */
export type CompareCalcContext = Readonly<{
  calc: CalcInputs;
  precision: string;
  seqMax: number;
  setBatch: (n: number) => void;
  setSeq: (n: number) => void;
  setPrecision: (p: string) => void;
}>;
