import { describe, expect, it } from "vitest";

import { expertFanOut } from "./expertFanOut";
import type { Node } from "../../../domain/spec";

const node = (id: string): Node => ({ id, type: "x", label: id, params: {} });

describe("expertFanOut", () => {
  it("returns an empty list for no children", () => {
    expect(expertFanOut([])).toEqual([]);
  });

  it("places router on top, experts in a grid, combine centered below", () => {
    const children = [
      node("router"),
      ...Array.from({ length: 8 }, (_, i) => node(`e${i}`)),
      node("combine"),
    ];
    const positions = expertFanOut(children);

    const cols = 6; // MOE_MAX_COLS
    const midX = ((cols - 1) / 2) * 200; // 500
    expect(positions[0]).toEqual({ id: "router", x: midX, y: 0 });
    // first expert under the grid, row 1
    expect(positions.find((p) => p.id === "e0")).toEqual({ id: "e0", x: 0, y: 100 });
    // expert 6 wraps to the second grid row
    expect(positions.find((p) => p.id === "e6")).toEqual({ id: "e6", x: 0, y: 200 });
    // combine centered under the (2-row) grid
    expect(positions.at(-1)).toEqual({ id: "combine", x: midX, y: 300 });
  });
});
