import { describe, expect, it } from "vitest";

import { fanOut } from "./fanOut";
import type { Node } from "../../../domain/spec";

const node = (id: string): Node => ({ id, type: "linear", label: id, params: {} });

describe("fanOut (self-attention layout)", () => {
  it("places Q, K, V in row 0 spaced by 320 px", () => {
    const positions = fanOut(
      ["q", "k", "v", "sdpa", "o"].map(node),
    );
    expect(positions[0]).toEqual({ id: "q", x: 0, y: 0 });
    expect(positions[1]).toEqual({ id: "k", x: 320, y: 0 });
    expect(positions[2]).toEqual({ id: "v", x: 640, y: 0 });
  });

  it("places SDPA in row 1, centered under K", () => {
    const positions = fanOut(
      ["q", "k", "v", "sdpa", "o"].map(node),
    );
    expect(positions[3]).toEqual({ id: "sdpa", x: 320, y: 240 });
  });

  it("places O in row 2, centered under SDPA", () => {
    const positions = fanOut(
      ["q", "k", "v", "sdpa", "o"].map(node),
    );
    expect(positions[4]).toEqual({ id: "o", x: 320, y: 480 });
  });

  it("falls back to a vertical chain for the 6th+ child (defensive)", () => {
    const positions = fanOut(
      ["q", "k", "v", "sdpa", "o", "extra"].map(node),
    );
    // 6th child: slot index 5 → falls back to (1, 5) per the QKV_SDPA_O table
    // → x = 320, y = 5 * 240 = 1200
    expect(positions[5]).toEqual({ id: "extra", x: 320, y: 1200 });
  });
});
