/** Default layout — children stacked vertically, single column. */

import type { LayoutStrategy } from "../LayoutRegistry";

const BLOCK_VSPACE = 140;

export const verticalStack: LayoutStrategy = (children) =>
  children.map((c, i) => ({ id: c.id, x: 0, y: i * BLOCK_VSPACE }));
