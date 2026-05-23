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
      response = await fetch(url, { headers: { Accept: "application/json" } });
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
