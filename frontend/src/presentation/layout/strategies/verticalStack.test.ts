import { describe, expect, it } from "vitest";

import { verticalStack } from "./verticalStack";
import type { Node } from "../../../domain/spec";

const node = (id: string): Node => ({ id, type: "linear", label: id, params: {} });

describe("verticalStack", () => {
  it("places every child at x=0 in a single column", () => {
    const positions = verticalStack([node("a"), node("b"), node("c")]);
    expect(positions.every((p) => p.x === 0)).toBe(true);
  });

  it("spaces children vertically by the BLOCK_VSPACE stride", () => {
    const positions = verticalStack([node("a"), node("b"), node("c")]);
    expect(positions[0]?.y).toBe(0);
    expect(positions[1]?.y).toBe(240);
    expect(positions[2]?.y).toBe(480);
  });

  it("preserves the input id order in the output", () => {
    const ids = ["foo", "bar", "baz"];
    const positions = verticalStack(ids.map(node));
    expect(positions.map((p) => p.id)).toEqual(ids);
  });

  it("returns an empty list for no children", () => {
    expect(verticalStack([])).toEqual([]);
  });
});
