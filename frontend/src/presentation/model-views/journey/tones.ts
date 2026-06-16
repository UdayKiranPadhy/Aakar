/**
 * Journey tones — map each stage kind to the canvas's semantic tone vocabulary,
 * so the rail reads as the same visual language as the Architecture diagram.
 */

import type { JourneyStageKind } from "../../../domain/tokenJourney";
import type { BlockVisualTone } from "../../blocks/BlockRegistry";

export const KIND_TONE: Record<JourneyStageKind, BlockVisualTone> = {
  "input-ids": "io",
  logits: "io",
  embedding: "embedding",
  "pos-encoding": "embedding",
  attn: "attention",
  mlp: "mlp",
  norm: "norm",
  "final-norm": "norm",
  "lm-head": "matrix",
  split: "residual",
  add: "residual",
};

// Values are CSS variables (the same --viz-* tokens the rail CSS uses), so the
// JS-driven tones — the pulse `--tone` and the legend swatch — track the theme
// too. Both consumers use these only as CSS values, where var() resolves.
export const TONE_COLOR: Record<BlockVisualTone, string> = {
  io: "var(--viz-io)",
  embedding: "var(--viz-embedding)",
  attention: "var(--viz-attention)",
  norm: "var(--viz-norm)",
  mlp: "var(--viz-mlp)",
  residual: "var(--viz-residual)",
  matrix: "var(--viz-matrix)",
};

export function toneColor(kind: JourneyStageKind): string {
  return TONE_COLOR[KIND_TONE[kind]];
}
