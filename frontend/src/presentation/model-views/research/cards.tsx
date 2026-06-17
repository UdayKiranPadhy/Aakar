/**
 * Shared paper + repository cards for the Research surfaces — used by the
 * single-model ResearchView and the side-by-side Compare Research tab, so the
 * card rendering lives in exactly one place. Each card shows whatever the
 * source actually returned; absent fields are simply omitted.
 */

import type { Paper, RepoInfo } from "../../../domain/research";
import { Pill } from "../../components/ui/Pill";
import styles from "./ResearchView.module.css";

function authorLine(authors: ReadonlyArray<string>): string {
  if (authors.length === 0) return "";
  if (authors.length <= 8) return authors.join(", ");
  return `${authors.slice(0, 8).join(", ")}, …`;
}

function pubYear(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : String(date.getFullYear());
}

export function PaperCard({ paper }: { paper: Paper }) {
  const authors = authorLine(paper.authors);
  const year = pubYear(paper.published);
  const meta = [authors, year, paper.comment].filter(Boolean).join(" · ");
  const tags = [...new Set([...(paper.fields_of_study ?? []), ...paper.categories])];

  return (
    <article className={styles.card}>
      <a className={styles.title} href={paper.abs_url} target="_blank" rel="noreferrer noopener">
        {paper.title || paper.arxiv_id}
      </a>
      {meta && <p className={styles.authors}>{meta}</p>}

      {paper.tldr && (
        <p className={styles.tldr}>
          <span className={styles.tldrLabel}>TL;DR</span> {paper.tldr}
        </p>
      )}

      <div className={styles.stats}>
        {typeof paper.citation_count === "number" && (
          <Stat value={paper.citation_count.toLocaleString()} label="citations" />
        )}
        {typeof paper.influential_citation_count === "number" && (
          <Stat value={paper.influential_citation_count.toLocaleString()} label="influential" />
        )}
        {typeof paper.hf_upvotes === "number" && (
          <Stat value={paper.hf_upvotes.toLocaleString()} label="HF upvotes" />
        )}
        {!!paper.hf_model_count && <Stat value={paper.hf_model_count.toLocaleString()} label="models" />}
        {!!paper.hf_dataset_count && (
          <Stat value={paper.hf_dataset_count.toLocaleString()} label="datasets" />
        )}
        {!!paper.hf_space_count && <Stat value={paper.hf_space_count.toLocaleString()} label="spaces" />}
      </div>

      {paper.summary && <p className={styles.abstract}>{paper.summary}</p>}

      {tags.length > 0 && (
        <div className={styles.row}>
          {tags.slice(0, 8).map((t) => (
            <Pill key={t} tone="neutral">
              {t}
            </Pill>
          ))}
        </div>
      )}

      <div className={styles.links}>
        <a href={paper.abs_url} target="_blank" rel="noreferrer noopener">
          arXiv:{paper.arxiv_id}
        </a>
        <a href={paper.pdf_url} target="_blank" rel="noreferrer noopener">
          PDF
        </a>
        {paper.doi && (
          <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer noopener">
            DOI
          </a>
        )}
      </div>
    </article>
  );
}

export function RepoCard({ repo }: { repo: RepoInfo }) {
  return (
    <article className={styles.card}>
      <a className={styles.title} href={repo.html_url} target="_blank" rel="noreferrer noopener">
        {repo.full_name}
      </a>
      {repo.description && <p className={styles.abstract}>{repo.description}</p>}
      <div className={styles.stats}>
        {typeof repo.stars === "number" && <Stat value={repo.stars.toLocaleString()} label="stars" />}
        {typeof repo.forks === "number" && <Stat value={repo.forks.toLocaleString()} label="forks" />}
      </div>
      <div className={styles.row}>
        {repo.license && <Pill tone="accent">{repo.license}</Pill>}
        {repo.language && <Pill tone="neutral">{repo.language}</Pill>}
        {repo.topics.slice(0, 6).map((t) => (
          <Pill key={t} tone="neutral">
            {t}
          </Pill>
        ))}
      </div>
    </article>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className={styles.stat}>
      <strong className={styles.statValue}>{value}</strong> {label}
    </span>
  );
}
