/**
 * Searches a bundled, build-time-generated list of popular HuggingFace model ids
 * — entirely client-side, no network request.
 *
 * This is the production search source. Calling the Hub directly from the
 * browser proved unreliable (its CloudFront edges intermittently drop the
 * per-origin CORS header), and we don't want a backend hop for search. So we
 * ship a static, popularity-ranked id list (see scripts/generate-popular-models.mjs)
 * and filter it in memory. Because the list is ordered by downloads, a plain
 * in-order scan surfaces the most popular matches first. Suggestions are
 * assistance only — users can still paste any id and submit it.
 */

import type { ModelSearchRepository } from "../../application/interfaces";
import { POPULAR_MODELS } from "./popularModels";

export class StaticModelSearchRepository implements ModelSearchRepository {
  constructor(private readonly models: readonly string[] = POPULAR_MODELS) {}

  // Returns a resolved Promise (not `async`) — the work is synchronous, but the
  // contract is async so a network-backed implementation can drop in unchanged.
  search(
    query: string,
    { limit = 8 }: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<ReadonlyArray<string>> {
    const q = query.trim().toLowerCase();
    if (!q) return Promise.resolve([]);

    const matches: string[] = [];
    for (const id of this.models) {
      if (id.toLowerCase().includes(q)) {
        matches.push(id);
        if (matches.length >= limit) break; // list is pre-ranked, so first N wins
      }
    }
    return Promise.resolve(matches);
  }
}
