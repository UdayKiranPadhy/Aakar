/**
 * Fetches model metadata + README from our backend, which proxies the public
 * HuggingFace Hub.
 *
 * We can't call the Hub directly from the browser: its `/api/models/{id}` and
 * `/{id}/resolve/main/README.md` endpoints send no `Access-Control-Allow-Origin`
 * header, so cross-origin browser fetches are blocked by CORS. The backend
 * (allowed via the API's CORS origin list) has no such restriction and returns
 * metadata already mapped to our snake_case `ModelInfo` shape.
 *
 * Routes:
 *   - metadata: `GET {API}/api/model-info?model_id={id}`   → ModelInfo (JSON)
 *   - readme:   `GET {API}/api/model-readme?model_id={id}` → markdown text
 *                                                            (204 = repo has no card)
 */

import type { ModelInfoRepository } from "../../application/interfaces";
import type { ModelInfo } from "../../domain/modelInfo";
import { ApiError, NetworkError } from "./errors";

export class HttpModelInfoRepository implements ModelInfoRepository {
  constructor(private readonly baseUrl: string) {}

  async fetchInfo(modelId: string): Promise<ModelInfo> {
    const url = `${this.base()}/api/model-info?model_id=${encodeURIComponent(modelId)}`;
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : "Network request failed");
    }
    if (!response.ok) throw await ApiError.fromResponse(response);
    // The backend returns Pydantic-validated snake_case matching `ModelInfo`;
    // per the app's contract we trust it (no frontend response validation).
    return (await response.json()) as ModelInfo;
  }

  async fetchReadme(modelId: string): Promise<string | null> {
    const url = `${this.base()}/api/model-readme?model_id=${encodeURIComponent(modelId)}`;
    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : "Network request failed");
    }
    if (response.status === 204) return null; // repo has no model card — normal
    if (!response.ok) throw await ApiError.fromResponse(response);
    return response.text();
  }

  private base(): string {
    return this.baseUrl.replace(/\/$/, "");
  }
}
