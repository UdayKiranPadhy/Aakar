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

export const TONE_COLOR: Record<BlockVisualTone, string> = {
  io: "#0891b2",
  embedding: "#7c3aed",
  attention: "#1a73e8",
  norm: "#64748b",
  mlp: "#16a34a",
  residual: "#f59e0b",
  matrix: "#4f46e5",
};

export function toneColor(kind: JourneyStageKind): string {
  return TONE_COLOR[KIND_TONE[kind]];
}
