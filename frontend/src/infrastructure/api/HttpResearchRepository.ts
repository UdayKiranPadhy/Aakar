/**
 * HTTP implementation of `ResearchRepository` — backs the Research view and the
 * detail-panel source viewer via /api/papers, /api/repo, /api/source.
 */

import type { ResearchRepository } from "../../application/interfaces";
import type { Paper, RepoInfo, SourceSnippet } from "../../domain/research";
import { ApiError, NetworkError } from "./errors";

export class HttpResearchRepository implements ResearchRepository {
  constructor(private readonly baseUrl: string) {}

  private base(): string {
    return this.baseUrl.replace(/\/$/, "");
  }

  async fetchPapers(modelId: string): Promise<ReadonlyArray<Paper>> {
    const url = `${this.base()}/api/papers?model_id=${encodeURIComponent(modelId)}`;
    return (await this.get(url).then((r) => r.json())) as ReadonlyArray<Paper>;
  }

  async fetchRepo(modelId: string): Promise<RepoInfo | null> {
    const url = `${this.base()}/api/repo?model_id=${encodeURIComponent(modelId)}`;
    return (await this.get(url).then((r) => r.json())) as RepoInfo | null;
  }

  async fetchSource(sourceUrl: string): Promise<SourceSnippet> {
    const url = `${this.base()}/api/source?url=${encodeURIComponent(sourceUrl)}`;
    // Source is immutable (pinned ref) — let the browser cache it.
    return (await this.get(url, "default").then((r) => r.json())) as SourceSnippet;
  }

  private async get(url: string, cache: RequestCache = "no-store"): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" }, cache });
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : "Network request failed");
    }
    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }
    return response;
  }
}
