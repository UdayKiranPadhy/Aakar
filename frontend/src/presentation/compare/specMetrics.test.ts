import { describe, expect, it } from "vitest";

import type { Spec } from "../../domain/spec";
import { specMetrics } from "./specMetrics";

const spec: Spec = {
  model_id: "meta-llama/Llama-3-8B",
  model_type: "llama",
  config_summary: {
    hidden_size: 4096,
    num_hidden_layers: 32,
    num_attention_heads: 32,
    num_key_value_heads: 8,
    vocab_size: 128256,
    total_params: 8_030_261_248,
  },
  graph: [{ id: "root", type: "x", label: "root", params: {}, module_class: "LlamaForCausalLM" }],
  attn_impl: "sdpa",
  position_encoding: "rope",
  param_dtype: "bfloat16",
  tied_word_embeddings: false,
};

describe("specMetrics", () => {
  it("extracts the headline metrics in order", () => {
    const byLabel = Object.fromEntries(specMetrics(spec).map((m) => [m.label, m.value]));
    expect(byLabel["Architecture"]).toBe("LlamaForCausalLM");
    expect(byLabel["Parameters"]).toBe("8.03B");
    expect(byLabel["Hidden size"]).toBe("4,096");
    expect(byLabel["KV heads"]).toBe("8");
    expect(byLabel["Attention impl"]).toBe("sdpa");
    expect(byLabel["Position encoding"]).toBe("rope");
    expect(byLabel["Tied embeddings"]).toBe("false");
  });

  it("renders an em-dash for missing fields", () => {
    const bare: Spec = { model_id: "x", model_type: "y", config_summary: {}, graph: [] };
    const byLabel = Object.fromEntries(specMetrics(bare).map((m) => [m.label, m.value]));
    expect(byLabel["Hidden size"]).toBe("—");
    expect(byLabel["Attention impl"]).toBe("—");
    expect(byLabel["Architecture"]).toBe("y"); // falls back to model_type
  });
});
