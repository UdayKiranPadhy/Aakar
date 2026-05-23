/**
 * HTTP implementation of the `ArchitectureRepository` interface.
 *
 * The only place in the frontend that knows the backend URL or HTTP details.
 */

import type { ArchitectureRepository } from "../../application/interfaces";
import type { Spec } from "../../domain/spec";
import { ApiError, NetworkError } from "./errors";

export class HttpArchitectureRepository implements ArchitectureRepository {
  constructor(private readonly baseUrl: string) {}

  async fetch(modelId: string): Promise<Spec> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/api/architecture?model_id=${encodeURIComponent(modelId)}`;
    let response: Response;
    try {
      // `no-store` so the browser doesn't serve a stale spec when an adapter
      // is edited and the backend restarts mid-session. Model specs are cheap
      // (one HTTP round-trip + an HF config fetch) so we don't lose much by
      // skipping the cache.
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
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
