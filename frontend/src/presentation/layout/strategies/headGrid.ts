/**
 * Head-grid layout for SDPA's level-4 internals.
 *
 * SDPA's children are the `num_heads` parallel `attention_head` cards plus
 * one trailing `head_concat`. Heads tile in a grid (`MAX_COLS` wide, wrapping
 * to additional rows) and the concat node sits centered underneath. This is
 * the same pattern as the level-3 fan-out for `self_attention` (Q/K/V → SDPA
 * → O), generalized to N parallel sources instead of 3.
 *
 * The 8-column cap keeps wide models legible — Llama-3-8B's 32 heads become
 * a 8×4 grid, Qwen3-0.6B's 16 a 8×2, GPT-2's 12 a 8×2 (rows of 8 + 4).
 */

import type { LayoutStrategy } from "../LayoutRegistry";

// Tuned for the compact `attention_head` renderer (160 px wide × ~70 px tall).
// 6 cols keeps the widest models (Llama-3-8B's 32 heads → 6×6) within a normal
// viewport's worth of layout area; 12 heads → 6×2 fits comfortably at zoom 1.
const SPACING_X = 200;
const SPACING_Y = 100;
const MAX_COLS = 6;

export const headGrid: LayoutStrategy = (children) => {
  if (children.length === 0) return [];
  if (children.length === 1) return [{ id: children[0]!.id, x: 0, y: 0 }];

  // Contract: every child up to the last is a head; the last is the concat.
  // Adapters guarantee this ordering via build_sdpa_with_heads().
  const heads = children.slice(0, -1);
  const concat = children[children.length - 1]!;

  const cols = Math.min(heads.length, MAX_COLS);
  const rows = Math.ceil(heads.length / cols);

  const headPositions = heads.map((head, i) => ({
    id: head.id,
    x: (i % cols) * SPACING_X,
    y: Math.floor(i / cols) * SPACING_Y,
  }));

  // Center the concat under the head grid (uses the populated column count,
  // so a short final row of e.g. 4 heads still sees the concat aligned to
  // the *grid* mid-line, not to those 4 heads).
  const concatX = ((cols - 1) / 2) * SPACING_X;
  const concatY = rows * SPACING_Y;

  return [...headPositions, { id: concat.id, x: concatX, y: concatY }];
};
