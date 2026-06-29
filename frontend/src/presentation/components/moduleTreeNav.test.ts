import { describe, expect, it } from "vitest";

import { flattenVisibleRows } from "./moduleTreeNav";
import { matchOutline } from "../../domain/navigation";
import type { Node } from "../../domain/spec";

const graph: ReadonlyArray<Node> = [
  {
    id: "root",
    type: "root",
    label: "Root",
    params: {},
    children: [
      {
        id: "a",
        type: "a",
        label: "Alpha",
        params: {},
        children: [
          { id: "a1", type: "x", label: "A One", params: {} },
          { id: "a2", type: "x", label: "A Two", params: {} },
        ],
      },
      { id: "b", type: "b", label: "Beta", params: {} },
    ],
  },
];

const keys = (rows: ReturnType<typeof flattenVisibleRows>) => rows.map((r) => r.key);

describe("flattenVisibleRows", () => {
  it("lists rows in DOM order, opening down to the default depth", () => {
    const rows = flattenVisibleRows(graph, null, new Map(), 2);
    expect(keys(rows)).toEqual(["root", "root/a", "root/a/a1", "root/a/a2", "root/b"]);
    expect(rows.find((r) => r.key === "root/a")?.open).toBe(true);
  });

  it("respects a collapse override (hides that node's children)", () => {
    const rows = flattenVisibleRows(graph, null, new Map([["root/a", false]]), 2);
    expect(keys(rows)).toEqual(["root", "root/a", "root/b"]);
  });

  it("respects an expand override deeper than the default depth", () => {
    // Default depth 1 would keep "a" closed; an override opens it.
    const closed = flattenVisibleRows(graph, null, new Map(), 1);
    expect(keys(closed)).toEqual(["root", "root/a", "root/b"]);
    const opened = flattenVisibleRows(graph, null, new Map([["root/a", true]]), 1);
    expect(keys(opened)).toContain("root/a/a1");
  });

  it("restricts to the matched branch when filtering", () => {
    const filter = matchOutline(graph, "A One");
    const rows = flattenVisibleRows(graph, filter, new Map(), 2);
    expect(keys(rows)).toEqual(["root", "root/a", "root/a/a1"]);
  });
});
