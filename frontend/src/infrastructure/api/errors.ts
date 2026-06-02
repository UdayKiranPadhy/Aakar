/**
 * Typed error hierarchy mirroring the backend's domain exceptions.
 *
 * The discriminator is the **HTTP status code** — the backend's contract — not
 * a string in the body. `fromResponse` switches on `res.status`; the body only
 * supplies data (message / model_id / architecture). Status codes are kept
 * unambiguous on the backend (request-validation is 400, so 422 means exactly
 * "unsupported architecture").
 */

export class ApiError extends Error {
  override name = "ApiError";

  constructor(
    public readonly status: number,
    message: string,
    public readonly modelId?: string,
    public readonly architecture?: string | null,
  ) {
    super(message);
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // Non-JSON body — fall through with status + statusText.
    }

    const message = body?.message ?? (res.statusText || `HTTP ${res.status}`);
    const modelId = body?.model_id || undefined;
    const architecture = body?.architecture ?? null;

    switch (res.status) {
      case 403:
        return new ModelGatedError(modelId ?? "", message);
      case 404:
        return new ModelNotFoundError(modelId ?? "", message);
      case 422:
        return new UnsupportedArchitectureError(modelId ?? "", architecture, message);
      default:
        // 400 (bad request), 5xx (introspection failed/timeout, hub unavailable),
        // and anything else are carried as a generic ApiError; the application
        // layer maps the remaining statuses to a user-facing error.
        return new ApiError(res.status, message, modelId, architecture);
    }
  }
}

export class ModelNotFoundError extends ApiError {
  override name = "ModelNotFoundError";
  constructor(modelId: string, message: string) {
    super(404, message, modelId);
  }
}

export class ModelGatedError extends ApiError {
  override name = "ModelGatedError";
  constructor(modelId: string, message: string) {
    super(403, message, modelId);
  }
}

export class UnsupportedArchitectureError extends ApiError {
  override name = "UnsupportedArchitectureError";
  constructor(modelId: string, architecture: string | null, message: string) {
    super(422, message, modelId, architecture);
  }
}

export class NetworkError extends ApiError {
  override name = "NetworkError";
  constructor(message: string) {
    super(0, message);
  }
}

type ApiErrorBody = {
  /** Informational only — the frontend discriminates on the HTTP status. */
  kind?: string;
  message?: string;
  model_id?: string;
  architecture?: string | null;
};
