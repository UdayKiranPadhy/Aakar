/**
 * Fan-out layout for `self_attention`.
 *
 * Self-attention's children (in adapter order) are: Q, K, V, SDPA, O.
 * They render as:
 *
 *     Q       K       V          ← row 0
 *             SDPA               ← row 1, centered
 *             O                  ← row 2, centered
 *
 * Any child beyond the expected 5 falls back to verticalStack-like positioning.
 */

import type { LayoutStrategy } from "../LayoutRegistry";

const SPACING_X = 320;
const SPACING_Y = 140;

// (column, row) pairs for the first 5 children in adapter order.
const QKV_SDPA_O_LAYOUT: ReadonlyArray<[number, number]> = [
  [0, 0], // Q
  [1, 0], // K
  [2, 0], // V
  [1, 1], // SDPA
  [1, 2], // O
];

export const fanOut: LayoutStrategy = (children) =>
  children.map((c, i) => {
    const slot = QKV_SDPA_O_LAYOUT[i] ?? [1, i];
    return { id: c.id, x: slot[0] * SPACING_X, y: slot[1] * SPACING_Y };
  });
