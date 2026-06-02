/**
 * Pure: extract the comparable headline metrics from a Spec, in display order.
 * Used by the Compare view to line two models up side by side.
 */

import type { Spec } from "../../domain/spec";
import { formatParamCount } from "../components/ui/format";

export type Metric = Readonly<{ label: string; value: string }>;

const DASH = "—";

function fromSummary(spec: Spec, key: string): string {
  const value = (spec.config_summary as Record<string, unknown>)[key];
  if (value === null || value === undefined) return DASH;
  return typeof value === "number" ? value.toLocaleString() : String(value);
}

const FIELDS: ReadonlyArray<{ label: string; get: (spec: Spec) => string }> = [
  { label: "Architecture", get: (s) => s.graph[0]?.module_class ?? s.model_type },
  {
    label: "Parameters",
    get: (s) => {
      const total = (s.config_summary as Record<string, unknown>).total_params ?? s.graph[0]?.param_count;
      return typeof total === "number" ? formatParamCount(total) : DASH;
    },
  },
  { label: "Hidden size", get: (s) => fromSummary(s, "hidden_size") },
  { label: "Layers", get: (s) => fromSummary(s, "num_hidden_layers") },
  { label: "Attention heads", get: (s) => fromSummary(s, "num_attention_heads") },
  { label: "KV heads", get: (s) => fromSummary(s, "num_key_value_heads") },
  { label: "Intermediate size", get: (s) => fromSummary(s, "intermediate_size") },
  { label: "Vocab size", get: (s) => fromSummary(s, "vocab_size") },
  { label: "Max positions", get: (s) => fromSummary(s, "max_position_embeddings") },
  { label: "Attention impl", get: (s) => s.attn_impl ?? DASH },
  { label: "Position encoding", get: (s) => s.position_encoding ?? DASH },
  { label: "Param dtype", get: (s) => s.param_dtype ?? DASH },
  {
    label: "Tied embeddings",
    get: (s) => (s.tied_word_embeddings == null ? DASH : String(s.tied_word_embeddings)),
  },
];

export function specMetrics(spec: Spec): ReadonlyArray<Metric> {
  return FIELDS.map((f) => ({ label: f.label, value: f.get(spec) }));
}
