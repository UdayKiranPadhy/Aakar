import { describe, expect, it } from "vitest";

import { flattenConfig, groupConfig } from "./configGrouping";

describe("flattenConfig", () => {
  it("recurses nested objects and arrays into dotted/bracketed paths", () => {
    const leaves = flattenConfig({
      hidden_size: 768,
      architectures: ["GPT2LMHeadModel"],
      rope_scaling: { factor: 8, type: "linear" },
      use_cache: true,
      pad_token_id: null,
    });
    const map = Object.fromEntries(leaves.map((l) => [l.path, l.value]));
    expect(map["hidden_size"]).toBe(768);
    expect(map["architectures[0]"]).toBe("GPT2LMHeadModel");
    expect(map["rope_scaling.factor"]).toBe(8);
    expect(map["rope_scaling.type"]).toBe("linear");
    expect(map["use_cache"]).toBe(true);
    expect(map["pad_token_id"]).toBeNull();
  });
});

describe("groupConfig", () => {
  it("never drops a key — the union of groups equals all leaves", () => {
    const leaves = flattenConfig({
      hidden_size: 768,
      num_hidden_layers: 12,
      num_attention_heads: 12,
      layer_norm_epsilon: 1e-5,
      vocab_size: 50257,
      bos_token_id: 0,
      torch_dtype: "float16",
      some_brand_new_field: "future",
      n_inner: 3072,
    });
    const grouped = groupConfig(leaves)
      .flatMap((g) => g.leaves.map((l) => l.path))
      .sort();
    const all = leaves.map((l) => l.path).sort();
    expect(grouped).toEqual(all);
  });

  it("routes unknown keys to the Other bucket (future-proof)", () => {
    const groups = groupConfig(flattenConfig({ some_brand_new_field: "x" }));
    expect(groups.map((g) => g.id)).toContain("other");
  });

  it("buckets attention-ish keys under attention", () => {
    const groups = groupConfig(flattenConfig({ num_attention_heads: 12, rope_theta: 10000 }));
    const attn = groups.find((g) => g.id === "attention");
    expect(attn?.leaves.map((l) => l.path).sort()).toEqual(["num_attention_heads", "rope_theta"]);
  });
});
