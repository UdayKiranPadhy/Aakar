/**
 * Tokens & Context tab — vocabulary, special-token IDs, RoPE settings, sliding
 * window and MoE routing, all read from the already-loaded Spec (no extra Hub
 * call). Tokenization examples / vocabulary-composition / token-efficiency are
 * deliberately absent — Aakar has no data source for them.
 */

import type { Spec } from "../../domain/spec";
import { GroupedBars } from "../compare/charts/GroupedBars";
import { summaryNumber } from "../compare/helpers/engineering";
import { tokenRows } from "../compare/helpers/tokensFacts";
import { ContextPositionalSection } from "../compare/sections/ContextPositionalSection";
import { CompareSection, DualColumns, Facts, ModelCard, type Tone } from "../compare/primitives";
import type { CompareViewProps } from "./CompareViewRegistry";

function Column({ spec, tone }: { spec: Spec | null; tone: Tone }) {
  return (
    <ModelCard title={spec?.model_id ?? null} tone={tone}>
      <Facts rows={tokenRows(spec)} />
    </ModelCard>
  );
}

export function TokensCompareView({ a, b }: CompareViewProps) {
  const vocabA = a ? summaryNumber(a.config_summary, "vocab_size") : undefined;
  const vocabB = b ? summaryNumber(b.config_summary, "vocab_size") : undefined;

  return (
    <>
      <CompareSection id="tokens" title="Tokenizer & special tokens">
        <DualColumns>
          <Column spec={a} tone="a" />
          <Column spec={b} tone="b" />
        </DualColumns>
      </CompareSection>

      {(vocabA !== undefined || vocabB !== undefined) && (
        <CompareSection id="vocab" title="Vocabulary size">
          <GroupedBars
            rows={[
              {
                label: "Vocabulary",
                a: vocabA,
                b: vocabB,
                aText: vocabA?.toLocaleString(),
                bText: vocabB?.toLocaleString(),
              },
            ]}
            seriesALabel={a?.model_id}
            seriesBLabel={b?.model_id}
          />
        </CompareSection>
      )}

      <ContextPositionalSection a={a} b={b} />
    </>
  );
}
