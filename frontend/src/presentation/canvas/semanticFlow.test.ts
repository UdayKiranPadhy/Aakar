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

describe("buildSemanticFlow — layer stacks", () => {
  it("renders ModuleList decoder children as compact layer cells in a grid", () => {
    const parent = node("model.layers", "module_list", "ModuleList");
    const children = Array.from({ length: 28 }, (_, index) =>
      node(`model.layers.${index}`, "qwen3_decoder_layer", `Layer ${index}`),
    );

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
      node("model.layers.0.self_attn", "qwen3_attention", "Qwen3Attention"),
      node("model.layers.0.mlp", "qwen3_mlp", "Qwen3MLP"),
      node("model.layers.0.input_layernorm", "qwen3_rms_norm", "Qwen3RMSNorm"),
      node("model.layers.0.post_attention_layernorm", "qwen3_rms_norm", "Qwen3RMSNorm"),
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
