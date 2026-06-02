/**
 * HTTP implementation of `ModelInfoRepository` — talks to the backend Hub-proxy
 * routes (/api/model-info, /api/model-readme). Mirrors HttpArchitectureRepository.
 */

import type { ModelInfoRepository } from "../../application/interfaces";
import type { ModelInfo } from "../../domain/modelInfo";
import { ApiError, NetworkError } from "./errors";

export class HttpModelInfoRepository implements ModelInfoRepository {
  constructor(private readonly baseUrl: string) {}

  private base(): string {
    return this.baseUrl.replace(/\/$/, "");
  }

  async fetchInfo(modelId: string): Promise<ModelInfo> {
    const url = `${this.base()}/api/model-info?model_id=${encodeURIComponent(modelId)}`;
    const response = await this.get(url);
    return (await response.json()) as ModelInfo;
  }

  async fetchReadme(modelId: string): Promise<string | null> {
    const url = `${this.base()}/api/model-readme?model_id=${encodeURIComponent(modelId)}`;
    const response = await this.get(url);
    const body = (await response.json()) as { readme: string | null };
    return body.readme;
  }

  private async get(url: string): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : "Network request failed");
    }
    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }
    return response;
  }
}
