/** Context & positional — context window, position encoding, RoPE base, window. */

import type { Spec } from "../../../domain/spec";
import { summaryNumber } from "../helpers/engineering";
import { CompareSection, DualColumns, Facts, type Fact, ModelCard, type Tone } from "../primitives";

const DASH = "—";

function rowsFor(spec: Spec | null): ReadonlyArray<Fact> {
  const ctx = spec ? summaryNumber(spec.config_summary, "max_position_embeddings") : undefined;
  const theta = spec ? summaryNumber(spec.config_summary, "rope_theta") : undefined;
  const window = spec ? summaryNumber(spec.config_summary, "sliding_window") : undefined;
  return [
    { label: "Max context", value: ctx !== undefined ? `${ctx.toLocaleString()} tokens` : DASH },
    { label: "Position encoding", value: spec?.position_encoding ?? DASH },
    { label: "RoPE θ (base)", value: theta !== undefined ? theta.toLocaleString() : DASH },
    { label: "Sliding window", value: window !== undefined ? `${window.toLocaleString()} tokens` : DASH },
  ];
}

function Column({ spec, tone }: { spec: Spec | null; tone: Tone }) {
  return (
    <ModelCard title={spec?.model_id ?? null} tone={tone}>
      <Facts rows={rowsFor(spec)} />
    </ModelCard>
  );
}

export function ContextPositionalSection({ a, b }: { a: Spec | null; b: Spec | null }) {
  return (
    <CompareSection id="context" title="Context & positional">
      <DualColumns>
        <Column spec={a} tone="a" />
        <Column spec={b} tone="b" />
      </DualColumns>
    </CompareSection>
  );
}
