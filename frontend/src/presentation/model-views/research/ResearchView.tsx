/**
 * Research — the academic + code context behind a model: the arXiv paper(s) it
 * cites (title, authors, TL;DR, abstract, citation + influential-citation
 * counts, HF upvotes, and how many models/datasets/spaces build on them) and
 * its linked GitHub repo. Shows whatever each source returns.
 */

import { useResearch } from "../../../application/useResearch";
import type { ModelViewProps } from "../ModelViewRegistry";
import { ViewEmpty, ViewError, ViewLoading, ViewSection } from "../shared/primitives";
import shared from "../shared/primitives.module.css";
import { PaperCard, RepoCard } from "./cards";
import styles from "./ResearchView.module.css";

export function ResearchView({ spec }: ModelViewProps) {
  const { papers, repo, loading, error } = useResearch(spec.model_id);

  if (loading) {
    return (
      <div className={shared.view}>
        <ViewLoading label="Loading research context…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className={shared.view}>
        <ViewError message={error} />
      </div>
    );
  }
  if (papers.length === 0 && !repo) {
    return (
      <div className={shared.view}>
        <ViewEmpty message="No linked papers or repository found for this model." />
      </div>
    );
  }

  return (
    <div className={shared.view}>
      {papers.length > 0 && (
        <ViewSection title={papers.length > 1 ? "Papers" : "Paper"}>
          <div className={styles.cards}>
            {papers.map((paper) => (
              <PaperCard key={paper.arxiv_id} paper={paper} />
            ))}
          </div>
        </ViewSection>
      )}
      {repo && (
        <ViewSection title="Repository">
          <RepoCard repo={repo} />
        </ViewSection>
      )}
    </div>
  );
}
