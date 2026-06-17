import { describe, expect, it } from "vitest";

import type { Node, Spec } from "../../../domain/spec";
import { sourceLinks } from "./sourceLinks";

function node(p: Partial<Node>): Node {
  return { id: "n", type: "t", label: "n", params: {}, ...p };
}

describe("sourceLinks", () => {
  it("collects nodes with a source_url, dedups by url, and sorts by class", () => {
    const spec: Spec = {
      model_id: "x/m",
      model_type: "m",
      config_summary: {},
      graph: [
        node({
          id: "root",
          label: "Root",
          children: [
            node({ id: "a", label: "A", module_class: "ZAttention", source_url: "https://github.com/x#L1" }),
            node({
              id: "b",
              label: "B",
              module_class: "AMlp",
              source_url: "https://github.com/y#L2",
              children: [
                node({ id: "c", label: "C", module_class: "ZAttention", source_url: "https://github.com/x#L1" }),
                node({ id: "d", label: "D", module_class: "Linear" }), // no source_url
              ],
            }),
          ],
        }),
      ],
    };
    const links = sourceLinks(spec);
    expect(links).toHaveLength(2); // dedup by url
    expect(links.map((l) => l.moduleClass)).toEqual(["AMlp", "ZAttention"]); // sorted
  });

  it("returns [] for a null spec", () => {
    expect(sourceLinks(null)).toEqual([]);
  });
});
