/**
 * Map an infrastructure error into a structured, presentation-ready load error.
 *
 * Unlike `toUserMessage` (which flattens to a single string for inline use),
 * this keeps the parts the error page needs: a headline, the detailed message
 * from the backend, an actionable hint, and the relevant facts (model id,
 * architecture, status). The `kind` drives which illustration the page shows.
 */

import {
  ApiError,
  ModelGatedError,
  ModelNotFoundError,
  NetworkError,
  UnsupportedArchitectureError,
} from "../infrastructure/api/errors";

export type LoadErrorKind =
  | "unsupported"
  | "not_found"
  | "gated"
  | "timeout"
  | "failed"
  | "unavailable"
  | "bad_request"
  | "server_error"
  | "network"
  | "unknown";

export type LoadError = Readonly<{
  kind: LoadErrorKind;
  /** Short headline, e.g. "Unsupported architecture". */
  title: string;
  /** The full explanation — the backend's message when there is one. */
  detail: string;
  /** Actionable guidance shown under the detail. */
  hint?: string;
  modelId?: string;
  architecture?: string | null;
  status?: number;
}>;

export function toLoadError(error: unknown): LoadError {
  if (error instanceof UnsupportedArchitectureError) {
    return {
      kind: "unsupported",
      title: "Unsupported architecture",
      detail: error.message,
      hint:
        "This model ships custom modeling code (it needs trust_remote_code) or " +
        "targets a different transformers version than Aakar pins. Models built " +
        "on stock architectures — Llama, Qwen, Mistral, GPT-2, Gemma, Mixtral and " +
        "the like — work automatically.",
      modelId: error.modelId || undefined,
      architecture: error.architecture,
      status: error.status,
    };
  }

  if (error instanceof ModelNotFoundError) {
    return {
      kind: "not_found",
      title: "Model not found",
      detail: error.message,
      hint:
        "Double-check the id on huggingface.co — it should look like " +
        "org/model (for example meta-llama/Llama-3-8B).",
      modelId: error.modelId || undefined,
      status: error.status,
    };
  }

  if (error instanceof ModelGatedError) {
    return {
      kind: "gated",
      title: "Gated or private model",
      detail: error.message,
      hint:
        "Aakar uses no HuggingFace token, so it can only read public repos. " +
        "Pick a public model, or request access and load it elsewhere.",
      modelId: error.modelId || undefined,
      status: error.status,
    };
  }

  if (error instanceof NetworkError) {
    return {
      kind: "network",
      title: "Can't reach the server",
      detail: error.message || "The request didn't complete.",
      hint: "Check that the Aakar backend is running and reachable, then try again.",
      status: error.status,
    };
  }

  if (error instanceof ApiError) {
    // Kinds without a dedicated subclass are distinguished by status code.
    if (error.status === 504) {
      return {
        kind: "timeout",
        title: "Introspection timed out",
        detail: error.message,
        hint:
          "Building this model's module tree took too long. Unusually large or " +
          "complex models can exceed the time budget — try again, or a smaller one.",
        modelId: error.modelId,
        status: error.status,
      };
    }
    if (error.status === 502) {
      return {
        kind: "failed",
        title: "Introspection failed",
        detail: error.message,
        hint:
          "Aakar reached the model but couldn't build it. Its custom code may be " +
          "incompatible with the pinned transformers, or depend on packages Aakar " +
          "doesn't ship.",
        modelId: error.modelId,
        status: error.status,
      };
    }
    if (error.status === 503) {
      return {
        kind: "unavailable",
        title: "Upstream unavailable",
        detail: error.message,
        hint: "The HuggingFace Hub looks temporarily unavailable. Try again shortly.",
        modelId: error.modelId,
        status: error.status,
      };
    }
    if (error.status === 400) {
      return {
        kind: "bad_request",
        title: "Invalid model id",
        detail: error.message,
        hint: "Use the org/model format — for example meta-llama/Llama-3-8B.",
        modelId: error.modelId,
        status: error.status,
      };
    }
    if (error.status >= 500) {
      // Any other 5xx is an unexpected error on our end (a 500-class crash).
      return {
        kind: "server_error",
        title: "Something went wrong",
        detail:
          error.message ||
          "Aakar hit an unexpected error while building this model's graph.",
        hint: "This is on our end — try again in a few moments.",
        modelId: error.modelId,
        status: error.status,
      };
    }
    return {
      kind: "unknown",
      title: "Something went wrong",
      detail: error.message || `Request failed (HTTP ${error.status}).`,
      modelId: error.modelId,
      status: error.status,
    };
  }

  return {
    kind: "unknown",
    title: "Something went wrong",
    detail: error instanceof Error ? error.message : "Unknown error.",
  };
}
