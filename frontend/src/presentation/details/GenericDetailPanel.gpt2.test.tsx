/**
 * Reproduction test for the "white screen on first-block click" report with
 * model_id=gpt2. Mirrors the real backend Spec for gpt2 (selected root) and
 * asserts the detail panel renders without throwing.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DetailPanel } from "./DetailPanel";
import { useArchStore } from "../../store/archStore";
import type { Spec } from "../../domain/spec";

// Pydantic optional fields serialize as JSON `null`, not absent — the spec
// hitting the frontend has `null` (not `undefined`) wherever the introspector
// returned `None`. Use `null` here so the test mirrors the real wire format
// and catches null-vs-undefined bugs (the original "white screen on first-
// block click" regression was exactly this: a `=== undefined` check that
// missed `null` and then crashed on `null.toLocaleString()`).
const gpt2Spec = {
  model_id: "gpt2",
  model_type: "gpt2",
  config_summary: {
    total_params: 163_037_184,
    model_type: "gpt2",
    hidden_size: 768,
    num_hidden_layers: 12,
    num_attention_heads: 12,
    vocab_size: 50257,
    max_position_embeddings: 1024,
    tie_word_embeddings: true,
    bos_token_id: 50256,
    eos_token_id: 50256,
  },
  graph: [
    {
      id: "GPT2LMHeadModel",
      type: "gpt2_lm_head_model",
      label: "GPT2LMHeadModel",
      meta: null,
      params: {},
      children: null,
      has_internals: true,
      param_count: 163_037_184,
      input_shape: "[B, S]",
      output_shape: "[B, S, 768]",
      module_class: "GPT2LMHeadModel",
      module_path: null,
      weight_shape: null,
      bias_shape: null,
      memory_bytes: 652_148_736,
      buffers: null,
      activation: null,
      flops: null,
    },
  ],
  notes: null,
  param_dtype: null,
  attn_impl: "sdpa",
  position_encoding: "learned",
  tied_word_embeddings: false,
  flops_reference: { batch_size: 1, seq_len: 2048 },
} as unknown as Spec;

describe("DetailPanel — GPT-2 root", () => {
  it("renders without throwing when the root is selected", () => {
    useArchStore.setState({
      spec: gpt2Spec,
      selectionPath: ["GPT2LMHeadModel"],
      detailOpen: true,
    });
    render(<DetailPanel />);
    expect(screen.getAllByText("GPT2LMHeadModel").length).toBeGreaterThan(0);
    // Spec-level pills should appear.
    expect(screen.getByText("sdpa")).toBeInTheDocument();
    expect(screen.getByText("learned")).toBeInTheDocument();
  });
});
