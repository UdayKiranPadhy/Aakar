import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Node, Spec } from "../../../domain/spec";
import { JourneyView } from "./JourneyView";

const n = (p: Partial<Node> & { id: string; type: string; label: string }): Node => ({
  params: {},
  ...p,
});

function layer(i: number): Node {
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
        intermediates: { q: "[B, 32, S, 64]", k: "[B, 8, S, 64]", attn_scores: "[B, 32, S, S]" },
        children: [n({ id: `model.layers.${i}.self_attn.q_proj`, type: "linear", label: "q_proj", category: "linear", role: "linear" })],
      }),
      n({ id: `model.layers.${i}.post_attention_layernorm`, type: "llama_rms_norm", label: "post_attention_layernorm", role: "norm", weight_shape: [2048] }),
      n({ id: `model.layers.${i}.mlp`, type: "llama_mlp", label: "mlp", module_class: "LlamaMLP", role: "mlp", has_internals: true, intermediates: { up: "[B, S, 8192]" } }),
    ],
  });
}

const spec: Spec = {
  model_id: "meta-llama/Llama-3.2-1B",
  model_type: "llama",
  position_encoding: "rope",
  tied_word_embeddings: true,
  config_summary: { hidden_size: 2048, vocab_size: 128256, num_hidden_layers: 16, num_attention_heads: 32, num_key_value_heads: 8 },
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
            n({ id: "model.embed_tokens", type: "embedding", label: "embed_tokens", category: "embedding", role: "token_embedding", params: { num_embeddings: 128256 }, weight_shape: [128256, 2048], output_shape: "[B, S, 2048]" }),
            n({ id: "model.layers", type: "module_list", label: "layers", category: "container", role: "layer_stack", has_internals: true, children: [layer(0), layer(1)] }),
            n({ id: "model.norm", type: "llama_rms_norm", label: "norm", role: "norm", weight_shape: [2048] }),
          ],
        }),
        n({ id: "lm_head", type: "linear", label: "lm_head", category: "linear", role: "lm_head", weight_shape: [128256, 2048], output_shape: "[B, S, 128256]" }),
      ],
    }),
  ],
};

describe("JourneyView", () => {
  it("renders the rail with the model's stages and the ×N decoder band", () => {
    render(<JourneyView spec={spec} />);
    expect(screen.getByRole("heading", { name: "Token Journey" })).toBeInTheDocument();
    expect(screen.getByText("Decoder layer · ×16")).toBeInTheDocument();
    // reused block cards carry the real module labels
    expect(screen.getByRole("button", { name: "embed_tokens" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "self_attn" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "mlp" })).toBeInTheDocument();
    // playback + parameter controls
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(screen.getByLabelText("Sequence length")).toBeInTheDocument();
  });

  it("focuses a stage on click and shows the REUSED detail panel (Tensor path + intermediates)", () => {
    render(<JourneyView spec={spec} />);
    fireEvent.click(screen.getByRole("button", { name: "self_attn" }));
    // GenericDetailPanel (reused via detailRegistry) renders its Tensor-path section.
    expect(screen.getByText("Tensor path")).toBeInTheDocument();
    expect(screen.getByText("attn_scores")).toBeInTheDocument();
  });

  it("shows a graceful empty state for an unrecognized architecture", () => {
    const garbage: Spec = {
      model_id: "x",
      model_type: "x",
      config_summary: {},
      graph: [n({ id: "Mystery", type: "mystery", label: "Mystery" })],
    };
    render(<JourneyView spec={garbage} />);
    expect(screen.getByText(/derived for this architecture/i)).toBeInTheDocument();
  });
});
