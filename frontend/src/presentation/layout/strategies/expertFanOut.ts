/**
 * Expert fan-out layout for a mixture-of-experts block's internals — the MoE
 * analogue of `headGrid`: a router on top, the N expert FFNs tiled in a grid
 * (`MOE_MAX_COLS` wide, wrapping to rows), and a weighted-combine node centered
 * underneath. Teaches router → top-k experts → weighted sum.
 *
 * Child contract (when used as a LayoutStrategy): `[router, expert_0 … expert_{N-1}, combine]`.
 *
 * Not registered on the live path today: the canvas's `semanticFlow` builder owns
 * positions for attention/MLP/MoE internals (it bypasses `LayoutRegistry`). This is
 * the ready-to-wire strategy for the day MoE internals route through the generic
 * layout path — exactly the growth `LayoutRegistry`'s docs anticipate. `MoeBlockNode`
 * reuses `MOE_MAX_COLS` so its in-card expert glyph wraps the same way.
 */

import type { LayoutStrategy } from "../LayoutRegistry";

const SPACING_X = 200;
const SPACING_Y = 100;
export const MOE_MAX_COLS = 6;

export const expertFanOut: LayoutStrategy = (children) => {
  if (children.length === 0) return [];
  // Too few to have a distinct router/experts/combine — just stack them.
  if (children.length <= 2) {
    return children.map((child, i) => ({ id: child.id, x: 0, y: i * SPACING_Y }));
  }

  const router = children[0]!;
  const combine = children[children.length - 1]!;
  const experts = children.slice(1, -1);

  const cols = Math.min(experts.length, MOE_MAX_COLS);
  const rows = Math.ceil(experts.length / cols);
  // Center the router and combine on the populated column count (the grid mid-line),
  // so a short final row still sees both aligned to the grid, not to that row.
  const gridMidX = ((cols - 1) / 2) * SPACING_X;

  const expertPositions = experts.map((expert, i) => ({
    id: expert.id,
    x: (i % cols) * SPACING_X,
    y: (1 + Math.floor(i / cols)) * SPACING_Y,
  }));

  return [
    { id: router.id, x: gridMidX, y: 0 },
    ...expertPositions,
    { id: combine.id, x: gridMidX, y: (1 + rows) * SPACING_Y },
  ];
};
