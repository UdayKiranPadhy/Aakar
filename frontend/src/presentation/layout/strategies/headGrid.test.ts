import { describe, expect, it } from "vitest";

import { headGrid } from "./headGrid";
import type { Node } from "../../../domain/spec";

const head = (i: number): Node => ({
  id: `head_${i}`,
  type: "attention_head",
  label: `Head ${i}`,
  params: {},
});
const concat: Node = {
  id: "concat",
  type: "head_concat",
  label: "Concat",
  params: {},
};

describe("headGrid", () => {
  it("returns an empty list when there are no children", () => {
    expect(headGrid([])).toEqual([]);
  });

  it("handles a single child (just the concat) by placing it at the origin", () => {
    expect(headGrid([concat])).toEqual([{ id: "concat", x: 0, y: 0 }]);
  });

  it("tiles 12 heads in a 6-wide × 2-tall grid (GPT-2 case)", () => {
    const heads = Array.from({ length: 12 }, (_, i) => head(i));
    const positions = headGrid([...heads, concat]);

    // First 6 in row 0
    for (let i = 0; i < 6; i++) {
      expect(positions[i]).toEqual({ id: `head_${i}`, x: i * 200, y: 0 });
    }
    // Next 6 in row 1
    for (let i = 6; i < 12; i++) {
      expect(positions[i]).toEqual({
        id: `head_${i}`,
        x: (i - 6) * 200,
        y: 100,
      });
    }
    // Concat centered under the 6-wide grid, in row 2
    const concatPos = positions.at(-1);
    expect(concatPos).toEqual({ id: "concat", x: 500, y: 200 });
  });

  it("wraps 32 heads in a 6-wide × 6-tall grid (Llama-3-8B case)", () => {
    const heads = Array.from({ length: 32 }, (_, i) => head(i));
    const positions = headGrid([...heads, concat]);

    // 32 / 6 = 5.33 → ceil = 6 rows for heads, concat in row 6
    expect(positions.at(-1)).toEqual({ id: "concat", x: 500, y: 600 });
    // First overflowed head (head_6) wraps to (0, 100)
    const head_6 = positions.find((p) => p.id === "head_6");
    expect(head_6).toEqual({ id: "head_6", x: 0, y: 100 });
  });
});
