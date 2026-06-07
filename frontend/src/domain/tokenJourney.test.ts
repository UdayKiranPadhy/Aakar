import { describe, expect, it } from "vitest";

import { deriveTokenJourney, flattenJourney } from "./tokenJourney";
import type { Node, Spec } from "./spec";

const n = (p: Partial<Node> & { id: string; type: string; label: string }): Node => ({
  params: {},
  ...p,
});

// ─── Llama-like: tied embeddings, RoPE, GQA (32 heads / 8 kv) ──────────────────

function llamaLayer(i: number): Node {
  return n({
    id: `model.layers.${i}`,
    type: "llama_decoder_layer",
    label: `Layer ${i}`,
    module_class: "LlamaDecoderLayer",
    has_internals: true,
    children: [
      n({ id: `model.layers.${i}.input_layernorm`, type: "llama_rms_norm", label: "input_layernorm", role: "norm", weight_shape: [2048] }),
      n({
        id: `model.layers.${i}.self_attn`,
        type: "llama_attention",
        label: "self_attn",
        module_class: "LlamaAttention",
        role: "attention",
        has_internals: true,
        intermediates: { q: "[B, 32, S, 64]", k: "[B, 8, S, 64]", v: "[B, 8, S, 64]", attn_scores: "[B, 32, S, S]" },
      }),
      n({ id: `model.layers.${i}.post_attention_layernorm`, type: "llama_rms_norm", label: "post_attention_layernorm", role: "norm", weight_shape: [2048] }),
      n({ id: `model.layers.${i}.mlp`, type: "llama_mlp", label: "mlp", module_class: "LlamaMLP", role: "mlp", has_internals: true, intermediates: { up: "[B, S, 8192]" } }),
    ],
  });
}

const llamaSpec: Spec = {
  model_id: "meta-llama/Llama-3.2-1B",
  model_type: "llama",
  position_encoding: "rope",
  tied_word_embeddings: true,
  config_summary: {
    hidden_size: 2048,
    vocab_size: 128256,
    num_hidden_layers: 16,
    num_attention_heads: 32,
    num_key_value_heads: 8,
    intermediate_size: 8192,
    gqa_ratio: 4,
  },
  graph: [
    n({
      id: "LlamaForCausalLM",
      type: "llama_for_causal_lm",
      label: "LlamaForCausalLM",
      has_internals: true,
      children: [
        n({
          id: "model",
          type: "llama_model",
          label: "model",
          has_internals: true,
          children: [
            n({ id: "model.embed_tokens", type: "embedding", label: "embed_tokens", category: "embedding", role: "token_embedding", params: { num_embeddings: 128256, embedding_dim: 2048 }, weight_shape: [128256, 2048], output_shape: "[B, S, 2048]" }),
            n({ id: "model.layers", type: "module_list", label: "layers", category: "container", role: "layer_stack", has_internals: true, children: [llamaLayer(0), llamaLayer(1)] }),
            n({ id: "model.norm", type: "llama_rms_norm", label: "norm", role: "norm", weight_shape: [2048] }),
          ],
        }),
        // The lm_head module exists even when tied (its weight is shared with embed_tokens).
        n({ id: "lm_head", type: "linear", label: "lm_head", category: "linear", role: "lm_head", weight_shape: [128256, 2048], output_shape: "[B, S, 128256]" }),
      ],
    }),
  ],
};

describe("deriveTokenJourney — Llama-like (tied, RoPE, GQA)", () => {
  const result = deriveTokenJourney(llamaSpec);

  it("derives a journey", () => {
    expect(result.ok).toBe(true);
  });

  it("starts with token ids → embedding that grows the shape to hidden", () => {
    if (!result.ok) throw new Error(result.reason);
    const [ids, embedding] = result.journey.preStages;
    expect(ids?.kind).toBe("input-ids");
    expect(ids?.outputShape).toBe("[B, S]");
    expect(embedding?.kind).toBe("embedding");
    expect(embedding?.outputShape).toBe("[B, S, 2048]");
    expect(embedding?.changedDim).toEqual({ axis: 2, from: null, to: "2048" });
    expect(embedding?.nodePath).toEqual(["LlamaForCausalLM", "model", "model.embed_tokens"]);
  });

  it("has no separate positional stage (RoPE is a badge on attention)", () => {
    if (!result.ok) throw new Error(result.reason);
    expect(result.journey.preStages.some((s) => s.kind === "pos-encoding")).toBe(false);
  });

  it("groups the layer into two residual blocks (attention, MLP), repeated ×16", () => {
    if (!result.ok) throw new Error(result.reason);
    const layer = result.journey.layer!;
    expect(layer.repeat).toBe(16);
    expect(layer.blocks).toHaveLength(2);

    const attnBlock = layer.blocks[0]!;
    expect(attnBlock.split.kind).toBe("split");
    expect(attnBlock.branch.map((s) => s.kind)).toEqual(["norm", "attn"]);
    const attn = attnBlock.branch[1]!;
    expect(attn.badges).toEqual(["GQA 4:1", "RoPE"]);
    expect(attn.intermediates?.attn_scores).toBe("[B, 32, S, S]");
    expect(attn.nodePath).toEqual(["LlamaForCausalLM", "model", "model.layers", "model.layers.0", "model.layers.0.self_attn"]);
    expect(attnBlock.add.kind).toBe("add");
    expect(attnBlock.add.inputs).toEqual(["skip", "self_attn"]);

    expect(layer.blocks[1]!.branch.map((s) => s.kind)).toEqual(["norm", "mlp"]);
  });

  it("ends with final norm → lm head (tied) → logits", () => {
    if (!result.ok) throw new Error(result.reason);
    const kinds = result.journey.postStages.map((s) => s.kind);
    expect(kinds).toEqual(["final-norm", "lm-head", "logits"]);
    const head = result.journey.postStages.find((s) => s.kind === "lm-head")!;
    expect(head.badges).toEqual(["tied"]);
    expect(head.outputShape).toBe("[B, S, 128256]");
    expect(head.changedDim).toEqual({ axis: 2, from: "2048", to: "128256" });
    expect(result.journey.postStages.at(-1)?.outputShape).toBe("[B, S, 128256]");
  });

  it("flattens to a single ordered timeline", () => {
    if (!result.ok) throw new Error(result.reason);
    const flat = flattenJourney(result.journey);
    // 2 pre (ids, embedding) + 2 blocks × 4 (split, norm, sub, add) + 3 post.
    expect(flat).toHaveLength(2 + 8 + 3);
    expect(flat[0]?.kind).toBe("input-ids");
    expect(flat.at(-1)?.kind).toBe("logits");
  });
});

// ─── GPT-2-like: learned positional (wte + wpe), MHA, real lm_head ─────────────

function gpt2Block(i: number): Node {
  return n({
    id: `transformer.h.${i}`,
    type: "gpt2_block",
    label: `Layer ${i}`,
    module_class: "GPT2Block",
    has_internals: true,
    children: [
      n({ id: `transformer.h.${i}.ln_1`, type: "layer_norm", label: "ln_1", category: "norm", role: "norm", weight_shape: [768] }),
      n({ id: `transformer.h.${i}.attn`, type: "gpt2_attention", label: "attn", module_class: "GPT2Attention", role: "attention", has_internals: true, intermediates: { q: "[B, 12, S, 64]", attn_scores: "[B, 12, S, S]" } }),
      n({ id: `transformer.h.${i}.ln_2`, type: "layer_norm", label: "ln_2", category: "norm", role: "norm", weight_shape: [768] }),
      n({ id: `transformer.h.${i}.mlp`, type: "gpt2_mlp", label: "mlp", module_class: "GPT2MLP", role: "mlp", has_internals: true, intermediates: { up: "[B, S, 3072]" } }),
    ],
  });
}

const gpt2Spec: Spec = {
  model_id: "gpt2",
  model_type: "gpt2",
  position_encoding: "learned",
  tied_word_embeddings: true,
  config_summary: {
    hidden_size: 768,
    vocab_size: 50257,
    num_hidden_layers: 12,
    num_attention_heads: 12,
    intermediate_size: 3072,
    max_position_embeddings: 1024,
  },
  graph: [
    n({
      id: "GPT2LMHeadModel",
      type: "gpt2_lm_head_model",
      label: "GPT2LMHeadModel",
      has_internals: true,
      children: [
        n({
          id: "transformer",
          type: "gpt2_model",
          label: "transformer",
          has_internals: true,
          children: [
            n({ id: "transformer.wte", type: "embedding", label: "wte", category: "embedding", role: "token_embedding", params: { num_embeddings: 50257, embedding_dim: 768 }, weight_shape: [50257, 768], output_shape: "[B, S, 768]" }),
            n({ id: "transformer.wpe", type: "embedding", label: "wpe", category: "embedding", role: "position_embedding", params: { num_embeddings: 1024, embedding_dim: 768 }, weight_shape: [1024, 768] }),
            n({ id: "transformer.h", type: "module_list", label: "h", category: "container", role: "layer_stack", has_internals: true, children: [gpt2Block(0), gpt2Block(1)] }),
            n({ id: "transformer.ln_f", type: "layer_norm", label: "ln_f", category: "norm", role: "norm", weight_shape: [768] }),
          ],
        }),
        n({ id: "lm_head", type: "linear", label: "lm_head", category: "linear", role: "lm_head", weight_shape: [50257, 768], output_shape: "[B, S, 50257]" }),
      ],
    }),
  ],
};

describe("deriveTokenJourney — GPT-2-like (learned positions, MHA)", () => {
  const result = deriveTokenJourney(gpt2Spec);

  it("picks the vocab-sized table as the token embedding and the other as positional", () => {
    if (!result.ok) throw new Error(result.reason);
    const kinds = result.journey.preStages.map((s) => s.kind);
    expect(kinds).toEqual(["input-ids", "embedding", "pos-encoding"]);
    expect(result.journey.preStages[1]?.label).toBe("wte");
    expect(result.journey.preStages[2]?.label).toBe("wpe");
  });

  it("labels attention MHA (no GQA, no RoPE for learned positions)", () => {
    if (!result.ok) throw new Error(result.reason);
    const attn = result.journey.layer!.blocks[0]!.branch[1]!;
    expect(attn.badges).toEqual(["MHA"]);
  });

  it("detects the real lm_head Linear by its vocab-sized output", () => {
    if (!result.ok) throw new Error(result.reason);
    const head = result.journey.postStages.find((s) => s.kind === "lm-head")!;
    expect(head.isSynthetic).toBeUndefined();
    expect(head.nodePath).toEqual(["GPT2LMHeadModel", "lm_head"]);
    expect(head.badges).toEqual(["tied"]);
  });
});

// ─── Mixtral-like: Mixture-of-Experts MLP ──────────────────────────────────────

describe("deriveTokenJourney — MoE (Mixtral-like)", () => {
  const moeSpec: Spec = {
    model_id: "mistralai/Mixtral-8x7B-v0.1",
    model_type: "mixtral",
    position_encoding: "rope",
    tied_word_embeddings: false,
    config_summary: {
      hidden_size: 4096,
      vocab_size: 32000,
      num_hidden_layers: 2,
      num_attention_heads: 32,
      num_key_value_heads: 8,
      num_local_experts: 8,
      num_experts_per_tok: 2,
    },
    graph: [
      n({
        id: "MixtralForCausalLM",
        type: "mixtral_for_causal_lm",
        label: "MixtralForCausalLM",
        has_internals: true,
        children: [
          n({
            id: "model",
            type: "mixtral_model",
            label: "model",
            has_internals: true,
            children: [
              n({ id: "model.embed_tokens", type: "embedding", label: "embed_tokens", category: "embedding", role: "token_embedding", params: { num_embeddings: 32000 }, weight_shape: [32000, 4096], output_shape: "[B, S, 4096]" }),
              n({
                id: "model.layers",
                type: "module_list",
                label: "layers",
                category: "container",
                role: "layer_stack",
                has_internals: true,
                children: [0, 1].map((i) =>
                  n({
                    id: `model.layers.${i}`,
                    type: "mixtral_decoder_layer",
                    label: `Layer ${i}`,
                    has_internals: true,
                    children: [
                      n({ id: `model.layers.${i}.input_layernorm`, type: "mixtral_rms_norm", label: "input_layernorm", role: "norm", weight_shape: [4096] }),
                      n({ id: `model.layers.${i}.self_attn`, type: "mixtral_attention", label: "self_attn", role: "attention", has_internals: true, intermediates: { attn_scores: "[B, 32, S, S]" } }),
                      n({ id: `model.layers.${i}.post_attention_layernorm`, type: "mixtral_rms_norm", label: "post_attention_layernorm", role: "norm", weight_shape: [4096] }),
                      n({ id: `model.layers.${i}.block_sparse_moe`, type: "mixtral_sparse_moe_block", label: "block_sparse_moe", role: "moe", has_internals: true, intermediates: { up: "[B, S, 14336]" } }),
                    ],
                  }),
                ),
              }),
              n({ id: "model.norm", type: "mixtral_rms_norm", label: "norm", role: "norm", weight_shape: [4096] }),
            ],
          }),
          n({ id: "lm_head", type: "linear", label: "lm_head", category: "linear", role: "lm_head", weight_shape: [32000, 4096], output_shape: "[B, S, 32000]" }),
        ],
      }),
    ],
  };

  it("marks the MLP sub-layer as MoE with an experts badge", () => {
    const result = deriveTokenJourney(moeSpec);
    if (!result.ok) throw new Error(result.reason);
    const moe = result.journey.layer!.blocks[1]!.branch.at(-1)!;
    expect(moe.kind).toBe("mlp");
    expect(moe.isMoe).toBe(true);
    expect(moe.badges).toEqual(["MoE · 8 experts (top-2)"]);
  });
});

// ─── gpt-oss-style MoE: `up` lives on the `experts` child; norms listed last ───

describe("deriveTokenJourney — nested MoE (gpt-oss-like)", () => {
  const gptOssSpec: Spec = {
    model_id: "openai/gpt-oss-20b",
    model_type: "gpt_oss",
    position_encoding: "rope",
    tied_word_embeddings: false,
    config_summary: {
      hidden_size: 2880,
      vocab_size: 201088,
      num_hidden_layers: 24,
      num_attention_heads: 64,
      num_key_value_heads: 8,
      num_local_experts: 32,
      num_experts_per_tok: 4,
    },
    graph: [
      n({
        id: "GptOssForCausalLM",
        type: "gpt_oss_for_causal_lm",
        label: "GptOssForCausalLM",
        has_internals: true,
        children: [
          n({
            id: "model",
            type: "gpt_oss_model",
            label: "model",
            has_internals: true,
            children: [
              n({ id: "model.embed_tokens", type: "embedding", label: "embed_tokens", category: "embedding", role: "token_embedding", params: { num_embeddings: 201088 }, weight_shape: [201088, 2880], output_shape: "[B, S, 2880]" }),
              n({
                id: "model.layers",
                type: "module_list",
                label: "layers",
                category: "container",
                role: "layer_stack",
                has_internals: true,
                children: [0, 1].map((i) =>
                  n({
                    id: `model.layers.${i}`,
                    type: "gpt_oss_decoder_layer",
                    label: `Layer ${i}`,
                    has_internals: true,
                    // gpt-oss lists self_attn, mlp BEFORE the norms.
                    children: [
                      n({ id: `model.layers.${i}.self_attn`, type: "gpt_oss_attention", label: "self_attn", role: "attention", has_internals: true, intermediates: { q: "[B, 64, S, 64]", attn_scores: "[B, 64, S, S]" } }),
                      n({
                        id: `model.layers.${i}.mlp`,
                        type: "gpt_oss_mlp",
                        label: "mlp",
                        // The backend tags the MoE block by fact (fused experts hold the
                        // intermediate-width tensor) and ships role "moe" on the block itself.
                        role: "moe",
                        has_internals: true,
                        intermediates: { up: "[B, S, 2880]" },
                        children: [
                          n({ id: `model.layers.${i}.mlp.router`, type: "gpt_oss_top_k_router", label: "router", weight_shape: [32, 2880] }),
                          n({ id: `model.layers.${i}.mlp.experts`, type: "gpt_oss_experts", label: "experts" }),
                        ],
                      }),
                      n({ id: `model.layers.${i}.input_layernorm`, type: "gpt_oss_rms_norm", label: "input_layernorm", role: "norm", weight_shape: [2880] }),
                      n({ id: `model.layers.${i}.post_attention_layernorm`, type: "gpt_oss_rms_norm", label: "post_attention_layernorm", role: "norm", weight_shape: [2880] }),
                    ],
                  }),
                ),
              }),
              n({ id: "model.norm", type: "gpt_oss_rms_norm", label: "norm", role: "norm", weight_shape: [2880] }),
            ],
          }),
          n({ id: "lm_head", type: "linear", label: "lm_head", category: "linear", role: "lm_head", weight_shape: [201088, 2880], output_shape: "[B, S, 201088]" }),
        ],
      }),
    ],
  };

  const result = deriveTokenJourney(gptOssSpec);

  it("detects the layer stack despite the MoE wrapper and norm ordering", () => {
    if (!result.ok) throw new Error(result.reason);
    expect(result.journey.layer).not.toBeNull();
    expect(result.journey.layer!.repeat).toBe(24);
    expect(result.journey.layer!.blocks).toHaveLength(2);
  });

  it("pairs norms to sub-layers by index (norms come last in source order)", () => {
    if (!result.ok) throw new Error(result.reason);
    const [attnBlock, mlpBlock] = result.journey.layer!.blocks;
    expect(attnBlock!.branch.map((s) => s.kind)).toEqual(["norm", "attn"]);
    expect(attnBlock!.branch[0]!.label).toBe("input_layernorm");
    expect(mlpBlock!.branch.map((s) => s.kind)).toEqual(["norm", "mlp"]);
    expect(mlpBlock!.branch[0]!.label).toBe("post_attention_layernorm");
  });

  it("flags the MoE sub-layer from config experts", () => {
    if (!result.ok) throw new Error(result.reason);
    const moe = result.journey.layer!.blocks[1]!.branch.at(-1)!;
    expect(moe.kind).toBe("mlp");
    expect(moe.isMoe).toBe(true);
    expect(moe.badges).toEqual(["MoE · 32 experts (top-4)"]);
  });
});

// ─── null shapes: fall back to config-derived shapes ───────────────────────────

describe("deriveTokenJourney — null shapes fall back to config dims", () => {
  const nullShapeSpec: Spec = {
    model_id: "tiny",
    model_type: "tiny",
    tied_word_embeddings: true,
    config_summary: { hidden_size: 512, vocab_size: 1000, num_hidden_layers: 1 },
    graph: [
      n({
        id: "Root",
        type: "tiny_for_causal_lm",
        label: "Root",
        has_internals: true,
        children: [
          n({
            id: "model",
            type: "tiny_model",
            label: "model",
            has_internals: true,
            children: [
              // No output_shape on the embedding — must fall back to [B, S, hidden].
              n({ id: "model.embed_tokens", type: "embedding", label: "embed_tokens", category: "embedding", role: "token_embedding", params: { num_embeddings: 1000 } }),
              n({
                id: "model.layers",
                type: "module_list",
                label: "layers",
                category: "container",
                role: "layer_stack",
                has_internals: true,
                children: [0, 1].map((i) =>
                  n({
                    id: `model.layers.${i}`,
                    type: "tiny_decoder_layer",
                    label: `Layer ${i}`,
                    has_internals: true,
                    children: [
                      n({ id: `model.layers.${i}.norm`, type: "tiny_rms_norm", label: "norm", role: "norm", weight_shape: [512] }),
                      n({ id: `model.layers.${i}.self_attn`, type: "tiny_attention", label: "self_attn", role: "attention", has_internals: true, intermediates: { attn_scores: "[B, 4, S, S]" } }),
                      n({ id: `model.layers.${i}.mlp`, type: "tiny_mlp", label: "mlp", role: "mlp", has_internals: true, intermediates: { up: "[B, S, 2048]" } }),
                    ],
                  }),
                ),
              }),
            ],
          }),
        ],
      }),
    ],
  };

  it("uses [B, S, hidden] when a node has no shapes", () => {
    const result = deriveTokenJourney(nullShapeSpec);
    if (!result.ok) throw new Error(result.reason);
    expect(result.journey.preStages[1]?.outputShape).toBe("[B, S, 512]");
    const norm = result.journey.layer!.blocks[0]!.branch[0]!;
    expect(norm.inputShape).toBe("[B, S, 512]");
  });
});

// ─── unrecognized / empty graphs degrade to a typed failure ────────────────────

describe("deriveTokenJourney — graceful failure", () => {
  it("returns ok:false for an empty graph", () => {
    const result = deriveTokenJourney({ model_id: "x", model_type: "x", config_summary: {}, graph: [] });
    expect(result.ok).toBe(false);
  });

  it("returns ok:false when nothing is recognizable", () => {
    const spec: Spec = {
      model_id: "x",
      model_type: "x",
      config_summary: {},
      graph: [n({ id: "Mystery", type: "mystery", label: "Mystery", children: [n({ id: "Mystery.thing", type: "thing", label: "thing" })] })],
    };
    expect(deriveTokenJourney(spec).ok).toBe(false);
  });
});
