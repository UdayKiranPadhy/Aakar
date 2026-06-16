import { describe, expect, it } from "vitest";

import type { Spec } from "../../../domain/spec";
import { deriveSeqMax, memoryScalingSeries } from "./memoryScaling";

function spec(over: Partial<Spec>): Spec {
  return { model_id: "m", model_type: "llama", config_summary: {}, graph: [], ...over };
}

function computable(id: string, ctx: number): Spec {
  return spec({
    model_id: id,
    config_summary: {
      total_params: 1000,
      num_hidden_layers: 2,
      num_key_value_heads: 4,
      head_dim: 8,
      max_position_embeddings: ctx,
    },
  });
}

const opts = { batch: 1, bytesPerElem: () => 2, steps: 4 };

describe("deriveSeqMax", () => {
  it("uses the largest declared context window", () => {
    expect(deriveSeqMax([computable("a", 8192), computable("b", 4096)])).toBe(8192);
  });
  it("falls back to the FLOPs reference seq when no context window is declared", () => {
    expect(deriveSeqMax([spec({ flops_reference: { batch_size: 1, seq_len: 1024 } })])).toBe(1024);
  });
});

describe("memoryScalingSeries", () => {
  it("produces one point per step, increasing with sequence length", () => {
    const { series, seqMax } = memoryScalingSeries([computable("a", 4096)], opts);
    expect(seqMax).toBe(4096);
    expect(series).toHaveLength(1);
    const bytes = (series[0]?.points ?? []).map((p) => p.bytes);
    expect(bytes).toHaveLength(4);
    for (let i = 1; i < bytes.length; i++) {
      expect(bytes[i] ?? 0).toBeGreaterThan(bytes[i - 1] ?? 0);
    }
  });

  it("omits a model whose footprint can't be computed", () => {
    const bad = spec({ model_id: "bad", config_summary: { total_params: 1000 } }); // no layers/kv/head_dim
    const { series, omitted } = memoryScalingSeries([computable("a", 4096), bad], opts);
    expect(series.map((s) => s.modelId)).toEqual(["a"]);
    expect(omitted).toBe(1);
  });

  it("reports bytesMax as the global maximum across plotted points", () => {
    const { series, bytesMax } = memoryScalingSeries([computable("a", 4096)], opts);
    const all = series.flatMap((s) => s.points.map((p) => p.bytes));
    expect(bytesMax).toBe(Math.max(...all));
  });
});
