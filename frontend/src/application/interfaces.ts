/**
 * Abstract interfaces the application layer depends on.
 *
 * Concrete implementations live in `infrastructure/`. Tests can inject any
 * object satisfying the shape — no mocking framework needed.
 */

import type { ModelInfo } from "../domain/modelInfo";
import type { Paper, RepoInfo, SourceSnippet } from "../domain/research";
import type { Spec } from "../domain/spec";
import type { TrendingModel } from "../domain/trending";

export interface ArchitectureRepository {
  /** `token` is an optional HF read token for gated models (sent as a header). */
  fetch(modelId: string, token?: string): Promise<Spec>;
}

export interface ModelInfoRepository {
  /** Public Hub metadata (downloads, license, files, safetensors, …). */
  fetchInfo(modelId: string): Promise<ModelInfo>;
  /** Model-card README markdown, or null when the repo has no card. */
  fetchReadme(modelId: string): Promise<string | null>;
}

export interface ModelSearchRepository {
  /**
   * Returns model ids matching `query`, most relevant first. The default
   * implementation filters a bundled list (no network); `signal` is accepted so
   * a network-backed implementation can drop in unchanged.
   */
  search(
    query: string,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<ReadonlyArray<string>>;
}

export interface TrendingRepository {
  fetchTrending(options?: {
    sort?: string;
    limit?: number;
  }): Promise<ReadonlyArray<TrendingModel>>;
}

export interface ResearchRepository {
  /** The arXiv paper(s) a model cites (with citation counts + HF Papers stats). */
  fetchPapers(modelId: string): Promise<ReadonlyArray<Paper>>;
  /** The model's linked GitHub repo, or null when none is resolved. */
  fetchRepo(modelId: string): Promise<RepoInfo | null>;
  /** The source slice behind a module's `source_url` permalink. */
  fetchSource(url: string): Promise<SourceSnippet>;
}
