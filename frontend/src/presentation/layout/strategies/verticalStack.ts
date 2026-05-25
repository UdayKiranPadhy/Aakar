/** Default layout — children stacked vertically, single column. */

import type { LayoutStrategy } from "../LayoutRegistry";

// Vertical stride between adjacent cards. Sized to fit the tallest block the
// GenericBlockNode can produce — title + class meta + 2 lines of symbolic
// in/out shape + weight shape + (params · memory) + flops, plus some breathing
// room and edge length so the dotted connector is visible.
const BLOCK_VSPACE = 240;

export const verticalStack: LayoutStrategy = (children) =>
  children.map((c, i) => ({ id: c.id, x: 0, y: i * BLOCK_VSPACE }));
