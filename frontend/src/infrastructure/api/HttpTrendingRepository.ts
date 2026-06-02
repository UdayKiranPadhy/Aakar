/**
 * HTTP implementation of `TrendingRepository` — backs the dynamic model chips
 * via the backend `/api/models?sort=trending` route. No hardcoded model lists.
 */

import type { TrendingRepository } from "../../application/interfaces";
import type { TrendingModel } from "../../domain/trending";
import { ApiError, NetworkError } from "./errors";

export class HttpTrendingRepository implements TrendingRepository {
  constructor(private readonly baseUrl: string) {}

  async fetchTrending({ sort = "trending", limit = 12 } = {}): Promise<ReadonlyArray<TrendingModel>> {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = `${base}/api/models?sort=${encodeURIComponent(sort)}&limit=${limit}`;
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : "Network request failed");
    }
    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }
    return (await response.json()) as ReadonlyArray<TrendingModel>;
  }
}
