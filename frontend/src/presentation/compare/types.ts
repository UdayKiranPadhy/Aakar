/** Shared calculator inputs threaded from CompareHost into the derived sections. */

import type { Spec } from "../../domain/spec";

export type CalcInputs = Readonly<{
  batch: number;
  seq: number;
  /** Bytes-per-element to use for a model (selected precision, or its native dtype). */
  bytesFor: (spec: Spec) => number | undefined;
}>;
