import { describe, expect, it } from "vitest";

import type { Node, Spec } from "../../../domain/spec";
import {
  arithmeticIntensity,
  attentionRegime,
  flopsAt,
  headDim,
  kvCacheBytes,
  kvHeads,
  totalParams,
  vramFor,
  weightsBytes,
} from "./engineering";

function spec(over: Partial<Spec>): Spec {
  return { model_id: "m", model_type: "llama", config_summary: {}, graph: [], ...over };
}

function node(over: Partial<Node>): Node {
  return { id: "n", type: "x", label: "n", params: {}, ...over };
}

describe("weightsBytes", () => {
  it("multiplies params by bytes per element", () => {
    expect(weightsBytes(8_000_000_000, 2)).toBe(16_000_000_000);
  });
  it("is undefined when params or bytes are missing", () => {
    expect(weightsBytes(undefined, 2)).toBeUndefined();
    expect(weightsBytes(8e9, undefined)).toBeUndefined();
  });
});

describe("kvCacheBytes", () => {
  const base = { numLayers: 32, numKvHeads: 8, headDim: 128, batch: 1, seq: 2048, bytesPerElem: 2 };
  it("applies 2·L·H_kv·D·B·S·bytes", () => {
    expect(kvCacheBytes(base)).toBe(2 * 32 * 8 * 128 * 1 * 2048 * 2);
  });
  it("is undefined when any factor is missing", () => {
    expect(kvCacheBytes({ ...base, numLayers: undefined })).toBeUndefined();
    expect(kvCacheBytes({ ...base, numKvHeads: undefined })).toBeUndefined();
    expect(kvCacheBytes({ ...base, headDim: undefined })).toBeUndefined();
    expect(kvCacheBytes({ ...base, bytesPerElem: undefined })).toBeUndefined();
  });
});

describe("kvHeads", () => {
  it("uses explicit num_key_value_heads when present", () => {
    expect(kvHeads({ num_attention_heads: 32, num_key_value_heads: 8 })).toBe(8);
  });
  it("falls back to num_attention_heads for multi-head attention", () => {
    expect(kvHeads({ num_attention_heads: 12 })).toBe(12);
  });
  it("is undefined when neither head count is present", () => {
    expect(kvHeads({})).toBeUndefined();
  });
});

describe("headDim", () => {
  it("uses the explicit config value", () => {
    expect(headDim({ head_dim: 128 })).toBe(128);
  });
  it("derives from hidden_size / num_attention_heads", () => {
    expect(headDim({ hidden_size: 4096, num_attention_heads: 32 })).toBe(128);
  });
  it("is undefined when underivable", () => {
    expect(headDim({ hidden_size: 4096 })).toBeUndefined();
  });
});

describe("flopsAt", () => {
  it("sums introspected FLOPs and scales by token count", () => {
    const root = node({ id: "root", flops: 1000, children: [node({ id: "c", flops: 1000 })] });
    const s = spec({ graph: [root], flops_reference: { batch_size: 1, seq_len: 1000 } });
    // atRef = 2000 at (1, 1000); scaling to (2, 1000) doubles it.
    expect(flopsAt(s, 2, 1000)).toBe(4000);
  });
  it("is undefined when no FLOPs are present", () => {
    expect(flopsAt(spec({ graph: [node({ id: "root" })] }), 1, 2048)).toBeUndefined();
  });
});

describe("arithmeticIntensity", () => {
  it("divides FLOPs by bytes moved", () => {
    expect(arithmeticIntensity(1000, 500)).toBe(2);
  });
  it("is undefined for missing or zero bytes", () => {
    expect(arithmeticIntensity(1000, 0)).toBeUndefined();
    expect(arithmeticIntensity(undefined, 500)).toBeUndefined();
  });
});

describe("attentionRegime", () => {
  it("is MHA when kv equals heads, or kv is absent", () => {
    expect(attentionRegime({ num_attention_heads: 32, num_key_value_heads: 32 })).toBe("MHA");
    expect(attentionRegime({ num_attention_heads: 32 })).toBe("MHA");
  });
  it("is MQA with a single kv head", () => {
    expect(attentionRegime({ num_attention_heads: 32, num_key_value_heads: 1 })).toBe("MQA");
  });
  it("is GQA when grouped", () => {
    expect(attentionRegime({ num_attention_heads: 32, num_key_value_heads: 8 })).toBe("GQA");
  });
  it("is — when the head count is unknown", () => {
    expect(attentionRegime({})).toBe("—");
  });
});

describe("totalParams / vramFor", () => {
  it("prefers the summary total, else the root node's count", () => {
    expect(totalParams(spec({ config_summary: { total_params: 5 } }))).toBe(5);
    expect(totalParams(spec({ graph: [node({ id: "root", param_count: 7 })] }))).toBe(7);
  });

  it("combines weights and KV into a total", () => {
    const s = spec({
      config_summary: { total_params: 1000, num_hidden_layers: 2, num_key_value_heads: 4, head_dim: 8 },
    });
    const r = vramFor(s, { batch: 1, seq: 10, bytesPerElem: 2 });
    expect(r.weights).toBe(2000);
    expect(r.kv).toBe(2 * 2 * 4 * 8 * 1 * 10 * 2);
    expect(r.total).toBe((r.weights ?? 0) + (r.kv ?? 0));
  });

  it("total is undefined when KV can't be computed", () => {
    const r = vramFor(spec({ config_summary: { total_params: 1000 } }), { batch: 1, seq: 10, bytesPerElem: 2 });
    expect(r.weights).toBe(2000);
    expect(r.kv).toBeUndefined();
    expect(r.total).toBeUndefined();
  });
});
