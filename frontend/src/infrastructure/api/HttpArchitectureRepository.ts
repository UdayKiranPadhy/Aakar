/**
 * HTTP implementation of the `ArchitectureRepository` interface.
 *
 * The only place in the frontend that knows the backend URL or HTTP details.
 * `/architecture` returns the module tree (fast); `/operations` returns the same
 * tree with the forward-pass trace applied (slower, fetched lazily) — both share
 * the identical request shape, so one private helper serves both.
 */

import type { ArchitectureRepository } from "../../application/interfaces";
import type { Spec } from "../../domain/spec";
import { ApiError, NetworkError } from "./errors";

export class HttpArchitectureRepository implements ArchitectureRepository {
  constructor(private readonly baseUrl: string) {}

  fetch(modelId: string, token?: string): Promise<Spec> {
    return this.getSpec("architecture", modelId, token);
  }

  fetchOperations(modelId: string, token?: string): Promise<Spec> {
    return this.getSpec("operations", modelId, token);
  }

  private async getSpec(
    endpoint: "architecture" | "operations",
    modelId: string,
    token?: string,
  ): Promise<Spec> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/api/${endpoint}?model_id=${encodeURIComponent(modelId)}`;
    // The token rides in a header, never the query string — so it stays out of
    // logs, referrers, and proxy caches. Only sent when the user supplied one.
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["X-HF-Token"] = token;
    let response: Response;
    try {
      // `no-store` so the browser doesn't serve a stale spec when an adapter
      // is edited and the backend restarts mid-session.
      response = await fetch(url, { headers, cache: "no-store" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network request failed";
      throw new NetworkError(message);
    }
    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }
    return (await response.json()) as Spec;
  }
}
