/**
 * Fetches model metadata and README directly from the public HuggingFace Hub
 * API — no backend proxy needed. The Hub API sets `Access-Control-Allow-Origin: *`
 * so browser fetches work cross-origin.
 *
 * Endpoints:
 *   - metadata: `GET https://huggingface.co/api/models/{id}?blobs=true`
 *   - readme:   `GET https://huggingface.co/{id}/resolve/main/README.md`
 *
 * CamelCase Hub fields are mapped to our snake_case `ModelInfo` domain type
 * inside this repository — the rest of the app never sees camelCase.
 */

import type { ModelInfoRepository } from "../../application/interfaces";
import type { HubSibling, ModelInfo } from "../../domain/modelInfo";
import { ModelGatedError, ModelNotFoundError, NetworkError } from "./errors";

const HF_ENDPOINT = "https://huggingface.co";

function encodeModelPath(modelId: string): string {
  return modelId.split("/").map(encodeURIComponent).join("/");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type HfRaw = Record<string, any>;

function mapSiblings(raw: unknown): ReadonlyArray<HubSibling> {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: HfRaw) => ({ rfilename: String(s.rfilename ?? ""), size: s.size }));
}

function mapModelInfo(data: HfRaw): ModelInfo {
  return {
    model_id: String(data.id ?? data.modelId ?? ""),
    author: data.author ?? undefined,
    downloads: data.downloads ?? undefined,
    likes: data.likes ?? undefined,
    license: data.license ?? undefined,
    pipeline_tag: data.pipeline_tag ?? data.pipelineTag ?? undefined,
    library_name: data.library_name ?? data.libraryName ?? undefined,
    last_modified: data.lastModified ?? undefined,
    created_at: data.createdAt ?? undefined,
    gated: data.gated ?? undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    siblings: mapSiblings(data.siblings),
    safetensors: data.safetensors ?? undefined,
    card_data: data.cardData ?? undefined,
    used_storage: data.usedStorage ?? undefined,
    inference: data.inference ?? undefined,
    spaces: Array.isArray(data.spaces) ? data.spaces : undefined,
    config: data.config ?? undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class HttpModelInfoRepository implements ModelInfoRepository {
  private readonly endpoint: string;

  constructor(endpoint: string = HF_ENDPOINT) {
    this.endpoint = endpoint.replace(/\/$/, "");
  }

  async fetchInfo(modelId: string): Promise<ModelInfo> {
    const url = `${this.endpoint}/api/models/${encodeModelPath(modelId)}?blobs=true`;
    const response = await this.get(url, modelId);
    const data = (await response.json()) as HfRaw;
    return mapModelInfo(data);
  }

  async fetchReadme(modelId: string): Promise<string | null> {
    const url = `${this.endpoint}/${encodeModelPath(modelId)}/resolve/main/README.md`;
    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : "Network request failed");
    }
    if (response.status === 404) return null;
    this.throwForStatus(response, modelId);
    return response.text();
  }

  private async get(url: string, modelId: string): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : "Network request failed");
    }
    this.throwForStatus(response, modelId);
    return response;
  }

  private throwForStatus(response: Response, modelId: string): void {
    if (response.ok) return;
    const status = response.status;
    // The Hub answers 401 ("Invalid username or password") for a repo that
    // either doesn't exist or is private — it won't disclose which to an
    // unauthenticated caller. 404 is rarer here but means the same thing.
    // Surface both as "not found or unavailable" (most often just a typo'd id).
    if (status === 404 || status === 401) {
      throw new ModelNotFoundError(
        modelId,
        `Model "${modelId}" not found or unavailable on HuggingFace Hub`,
      );
    }
    // 403 is an explicit access refusal on a repo that does exist (gated).
    if (status === 403) {
      throw new ModelGatedError(modelId, `Model "${modelId}" requires authorization`);
    }
    throw new NetworkError(`HuggingFace Hub returned ${status}`);
  }
}
