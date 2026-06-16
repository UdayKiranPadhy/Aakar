/**
 * Searches the HuggingFace Hub for models — the ONE repository that talks to the
 * Hub directly from the browser instead of our backend.
 *
 * The Hub's `/api/models` list endpoint sends `Access-Control-Allow-Origin`, so
 * a cross-origin browser fetch is allowed (unlike the single-model metadata /
 * README endpoints, which we proxy through the API). Keeping autocomplete here
 * means it adds zero load to our backend and stays live without any maintained
 * model list.
 *
 * If the Hub ever drops CORS on this endpoint, swap in a backend-proxy
 * implementation of `ModelSearchRepository` — no caller changes.
 */

import type { ModelSearchRepository } from "../../application/interfaces";
import type { ModelSummary } from "../../domain/modelSearch";
import { ApiError, NetworkError } from "./errors";

/** Raw shape of a Hub `/api/models` list item — only the fields we consume. */
type HubModelHit = {
  id: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string;
};

export class HfModelSearchRepository implements ModelSearchRepository {
  constructor(private readonly hubUrl: string = "https://huggingface.co") {}

  async search(
    query: string,
    { limit = 8, signal }: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<ReadonlyArray<ModelSummary>> {
    const q = query.trim();
    if (!q) return [];

    // `library=transformers` biases toward models the backend introspector can
    // actually load; the popularity sort floats the canonical repo (e.g. the
    // real `openai-community/gpt2`) above the long tail of forks and re-uploads.
    const params = new URLSearchParams({
      search: q,
      library: "transformers",
      sort: "downloads",
      direction: "-1",
      limit: String(limit),
    });
    const url = `${this.hubUrl.replace(/\/$/, "")}/api/models?${params}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" }, signal });
    } catch (e) {
      // A superseded request is aborted on purpose — let that propagate so the
      // caller can tell it apart from a genuine network failure.
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new NetworkError(e instanceof Error ? e.message : "HF Hub request failed");
    }
    if (!response.ok) throw new ApiError(response.status, `HF Hub responded ${response.status}`);

    const hits = (await response.json()) as ReadonlyArray<HubModelHit>;
    return hits.map((m) => ({
      id: m.id,
      downloads: m.downloads ?? 0,
      likes: m.likes ?? 0,
      pipelineTag: m.pipeline_tag ?? null,
    }));
  }
}
