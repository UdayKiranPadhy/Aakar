/**
 * Typed error hierarchy mirroring the backend's domain exceptions.
 *
 * The HTTP repository converts response bodies into these so callers can
 * branch on subclass (and not on numeric status codes).
 */

export class ApiError extends Error {
  override name = "ApiError";

  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // Non-JSON body — fall through.
    }

    const message = body?.message ?? (res.statusText || `HTTP ${res.status}`);

    switch (body?.kind) {
      case "model_not_found":
        return new ModelNotFoundError(body.model_id ?? "", message);
      case "model_gated":
        return new ModelGatedError(body.model_id ?? "", message);
      case "unsupported_architecture":
        return new UnsupportedArchitectureError(
          body.model_id ?? "",
          body.architecture ?? null,
          message,
        );
      default:
        return new ApiError(res.status, message);
    }
  }
}

export class ModelNotFoundError extends ApiError {
  override name = "ModelNotFoundError";
  constructor(
    public readonly modelId: string,
    message: string,
  ) {
    super(404, message);
  }
}

export class ModelGatedError extends ApiError {
  override name = "ModelGatedError";
  constructor(
    public readonly modelId: string,
    message: string,
  ) {
    super(403, message);
  }
}

export class UnsupportedArchitectureError extends ApiError {
  override name = "UnsupportedArchitectureError";
  constructor(
    public readonly modelId: string,
    public readonly architecture: string | null,
    message: string,
  ) {
    super(422, message);
  }
}

export class NetworkError extends ApiError {
  override name = "NetworkError";
  constructor(message: string) {
    super(0, message);
  }
}

type ApiErrorBody = {
  kind?: string;
  message?: string;
  model_id?: string;
  architecture?: string | null;
};
