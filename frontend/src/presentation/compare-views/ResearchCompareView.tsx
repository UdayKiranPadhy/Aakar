/**
 * Research tab — the linked papers + GitHub repo for each model, side by side,
 * reusing the shared PaperCard / RepoCard from the single-model Research view.
 * Each column fetches and degrades independently (one model may have papers
 * while the other has none).
 */

import { useResearch, type ResearchState } from "../../application/useResearch";
import type { Spec } from "../../domain/spec";
import { CompareSection, DualColumns, ModelCard, type Tone } from "../compare/primitives";
import { PaperCard, RepoCard } from "../model-views/research/cards";
import { ViewEmpty, ViewError, ViewLoading } from "../model-views/shared/primitives";
import type { CompareViewProps } from "./CompareViewRegistry";
import shared from "./shared.module.css";

function Column({ spec, state, tone }: { spec: Spec | null; state: ResearchState; tone: Tone }) {
  if (!spec) {
    return (
      <ModelCard title={null} tone={tone}>
        <span className={shared.muted}>—</span>
      </ModelCard>
    );
  }
  const { papers, repo, loading, error } = state;
  return (
    <ModelCard title={spec.model_id} tone={tone}>
      {loading ? (
        <ViewLoading label="Loading research…" />
      ) : error ? (
        <ViewError message={error} />
      ) : papers.length === 0 && !repo ? (
        <ViewEmpty message="No linked papers or repository." />
      ) : (
        <div className={shared.stack}>
          {papers.map((paper) => (
            <PaperCard key={paper.arxiv_id} paper={paper} />
          ))}
          {repo && <RepoCard repo={repo} />}
        </div>
      )}
    </ModelCard>
  );
}

export function ResearchCompareView({ a, b }: CompareViewProps) {
  const researchA = useResearch(a?.model_id);
  const researchB = useResearch(b?.model_id);

  return (
    <CompareSection id="research" title="Research & code">
      <DualColumns>
        <Column spec={a} state={researchA} tone="a" />
        <Column spec={b} state={researchB} tone="b" />
      </DualColumns>
    </CompareSection>
  );
}
