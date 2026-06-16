/** Attention & MoE — head counts, GQA grouping, and expert routing per model. */

import type { Spec } from "../../../domain/spec";
import { attentionRegime, headDim, summaryNumber } from "../helpers/engineering";
import { CompareSection, DualColumns, Facts, type Fact, ModelCard, type Tone } from "../primitives";

const DASH = "—";

function fmt(n: number | undefined): string {
  return n === undefined ? DASH : n.toLocaleString();
}

function rowsFor(spec: Spec | null): ReadonlyArray<Fact> {
  const experts = spec ? summaryNumber(spec.config_summary, "num_local_experts") : undefined;
  const perTok = spec ? summaryNumber(spec.config_summary, "num_experts_per_tok") : undefined;
  const gqa = spec ? summaryNumber(spec.config_summary, "gqa_ratio") : undefined;
  return [
    { label: "Attention", value: spec ? attentionRegime(spec.config_summary) : DASH },
    { label: "Query heads", value: fmt(spec ? summaryNumber(spec.config_summary, "num_attention_heads") : undefined) },
    { label: "KV heads", value: fmt(spec ? summaryNumber(spec.config_summary, "num_key_value_heads") : undefined) },
    { label: "Head dim", value: fmt(spec ? headDim(spec.config_summary) : undefined) },
    { label: "GQA ratio", value: gqa !== undefined ? `${gqa}:1` : DASH },
    {
      label: "Experts",
      value: experts !== undefined ? `${experts} · top-${perTok ?? "?"}` : spec ? "Dense" : DASH,
    },
  ];
}

function Column({ spec, tone }: { spec: Spec | null; tone: Tone }) {
  return (
    <ModelCard title={spec?.model_id ?? null} tone={tone}>
      <Facts rows={rowsFor(spec)} />
    </ModelCard>
  );
}

export function AttentionMoeSection({ a, b }: { a: Spec | null; b: Spec | null }) {
  return (
    <CompareSection id="attention" title="Attention & MoE">
      <DualColumns>
        <Column spec={a} tone="a" />
        <Column spec={b} tone="b" />
      </DualColumns>
    </CompareSection>
  );
}
