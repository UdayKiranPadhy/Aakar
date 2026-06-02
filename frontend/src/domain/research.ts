/**
 * Research context types — mirror the backend `domain/research.py`.
 * Surfaced by the Research view (papers + repo) and the detail-panel source
 * viewer (source snippet).
 */

export type Paper = Readonly<{
  arxiv_id: string;
  title: string;
  summary: string;
  authors: ReadonlyArray<string>;
  published?: string;
  updated?: string;
  categories: ReadonlyArray<string>;
  primary_category?: string;
  abs_url: string;
  pdf_url: string;
  comment?: string;
  doi?: string;
  citation_count?: number;
  influential_citation_count?: number;
  tldr?: string;
  fields_of_study?: ReadonlyArray<string>;
  hf_upvotes?: number;
  hf_model_count?: number;
  hf_dataset_count?: number;
  hf_space_count?: number;
}>;

export type RepoInfo = Readonly<{
  full_name: string;
  html_url: string;
  description?: string;
  stars?: number;
  forks?: number;
  topics: ReadonlyArray<string>;
  license?: string;
  language?: string;
  pushed_at?: string;
}>;

export type SourceSnippet = Readonly<{
  url: string;
  owner: string;
  repo: string;
  ref: string;
  path: string;
  start_line: number;
  end_line: number;
  code: string;
  language?: string;
}>;
