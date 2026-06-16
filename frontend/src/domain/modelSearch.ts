/**
 * A single HuggingFace Hub model search hit, mapped from the Hub's
 * `/api/models` list endpoint.
 *
 * Frontend-only — unlike `Spec`/`TrendingModel` it is NOT part of the backend
 * contract. It powers the search-bar autocomplete, which queries the Hub
 * directly from the browser (the Hub list endpoint sends CORS headers), so
 * suggestions never round-trip through our API.
 */

export type ModelSummary = Readonly<{
  /** Canonical repo id, e.g. `openai-community/gpt2`. */
  id: string;
  downloads: number;
  likes: number;
  /** HF pipeline tag (e.g. `text-generation`), or null when untagged. */
  pipelineTag: string | null;
}>;
