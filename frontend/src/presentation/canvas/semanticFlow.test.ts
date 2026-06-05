import { describe, expect, it } from "vitest";

import { buildSemanticFlow, isSyntheticNode } from "./semanticFlow";
import type { Node } from "../../domain/spec";

const node = (id: string, type: string, label = id): Node => ({
  id,
  type,
  label,
  module_class: label,
  params: {},
});

// A realistic decoder layer as the backend emits it: the container carries
// `category: "container"`, norms a 1-D `weight_shape`, and attention/MLP the
// `intermediates` fingerprint — the structural signals classification keys off
// (never the class name).
const decoderLayer = (i: number): Node => ({
  id: `model.layers.${i}`,
  type: "qwen3_decoder_layer",
  label: `Layer ${i}`,
  module_class: "Qwen3DecoderLayer",
  params: {},
  children: [
    { ...node(`model.layers.${i}.input_layernorm`, "qwen3_rms_norm", "Qwen3RMSNorm"), weight_shape: [2048] },
    { ...node(`model.layers.${i}.self_attn`, "qwen3_attention", "Qwen3Attention"), intermediates: { attn_scores: "[B, 16, S, S]" } },
    { ...node(`model.layers.${i}.post_attention_layernorm`, "qwen3_rms_norm", "Qwen3RMSNorm"), weight_shape: [2048] },
    { ...node(`model.layers.${i}.mlp`, "qwen3_mlp", "Qwen3MLP"), intermediates: { up: "[B, S, 3072]" } },
  ],
});

describe("buildSemanticFlow — layer stacks", () => {
  it("renders ModuleList decoder children as compact layer cells in a grid", () => {
    const parent: Node = { ...node("model.layers", "module_list", "ModuleList"), category: "container" };
    const children = Array.from({ length: 28 }, (_, index) => decoderLayer(index));

    const flow = buildSemanticFlow(parent, children);

    expect(flow).not.toBeNull();
    expect(flow?.nodes).toHaveLength(28);
    expect(flow?.variants.get("model.layers.0")).toBe("layer-cell");
    expect(flow?.positions[5]).toEqual({ id: "model.layers.5", x: 0, y: 116 });
    expect(flow?.fitViewOptions.minZoom).toBeGreaterThan(0.5);
  });
});

describe("buildSemanticFlow — decoder layers", () => {
  it("reorders Qwen decoder children into forward-pass order with residual glyphs", () => {
    const parent = node("model.layers.0", "qwen3_decoder_layer", "Qwen3DecoderLayer");
    const children = [
      { ...node("model.layers.0.self_attn", "qwen3_attention", "Qwen3Attention"), intermediates: { attn_scores: "[B, 16, S, S]" } },
      { ...node("model.layers.0.mlp", "qwen3_mlp", "Qwen3MLP"), intermediates: { up: "[B, S, 3072]" } },
      { ...node("model.layers.0.input_layernorm", "qwen3_rms_norm", "Qwen3RMSNorm"), weight_shape: [2048] },
      { ...node("model.layers.0.post_attention_layernorm", "qwen3_rms_norm", "Qwen3RMSNorm"), weight_shape: [2048] },
    ];

    const flow = buildSemanticFlow(parent, children);

    expect(flow?.nodes.map((n) => n.label)).toEqual([
      "Input",
      "Qwen3RMSNorm",
      "Qwen3Attention",
      "+ residual",
      "Qwen3RMSNorm",
      "Qwen3MLP",
      "+ residual",
    ]);
    expect(flow?.edges.filter((edge) => edge.type === "residual")).toHaveLength(2);
  });
});

describe("buildSemanticFlow — attention and MLP", () => {
  it("adds score, softmax, and value-mix glyphs to attention modules", () => {
    const parent: Node = {
      ...node("model.layers.0.self_attn", "qwen3_attention", "Qwen3Attention"),
      intermediates: {
        q: "[B, 16, S, 128]",
        k: "[B, 8, S, 128]",
        v: "[B, 8, S, 128]",
        attn_scores: "[B, 16, S, S]",
      },
    };
    const children = [
      node("model.layers.0.self_attn.q_proj", "linear", "Q proj"),
      node("model.layers.0.self_attn.k_proj", "linear", "K proj"),
      node("model.layers.0.self_attn.v_proj", "linear", "V proj"),
      node("model.layers.0.self_attn.o_proj", "linear", "O proj"),
    ];

    const flow = buildSemanticFlow(parent, children);
    const synthetic = flow?.nodes.filter(isSyntheticNode).map((n) => n.type);

    expect(synthetic).toEqual([
      "attention_heads",
      "attention_heads",
      "attention_heads",
      "attention_scores",
      "attention_softmax",
      "attention_mix",
    ]);
    expect(flow?.nodes.find((n) => n.type === "attention_scores")?.meta).toBe("[B, 16, S, S]");
    expect(flow?.nodes.find((n) => n.label === "K heads")?.meta).toBe("[B, 8, S, 128]");
  });

  it("shows gated MLPs as gate/up branches feeding an elementwise product", () => {
    const parent: Node = {
      ...node("model.layers.0.mlp", "qwen3_mlp", "Qwen3MLP"),
      intermediates: { up: "[B, S, 3072]" },
    };
    const children = [
      node("model.layers.0.mlp.gate_proj", "linear", "Gate proj"),
      node("model.layers.0.mlp.up_proj", "linear", "Up proj"),
      node("model.layers.0.mlp.down_proj", "linear", "Down proj"),
      node("model.layers.0.mlp.act_fn", "si_lu_activation", "Act fn"),
    ];

    const flow = buildSemanticFlow(parent, children);

    expect(flow?.nodes.map((n) => n.label)).toContain("Gate × up");
    expect(flow?.edges.map((edge) => `${edge.source}→${edge.target}`)).toContain(
      "model.layers.0.mlp.up_proj→__flow__model.layers.0.mlp.multiply",
    );
  });
});
