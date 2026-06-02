/**
 * Translate an infrastructure error into a user-facing message. Shared by the
 * data-loading hooks (useArchitecture, useModelInfo, …) so the wording stays
 * consistent across the app.
 */

import {
  ApiError,
  ModelGatedError,
  ModelNotFoundError,
  NetworkError,
  UnsupportedArchitectureError,
} from "../infrastructure/api/errors";

export function toUserMessage(error: unknown): string {
  if (error instanceof ModelNotFoundError) {
    return `Model not found or unavailable: ${error.modelId}`;
  }
  if (error instanceof ModelGatedError) {
    return `Model is gated or private (Aakar uses no HuggingFace token): ${error.modelId}`;
  }
  if (error instanceof UnsupportedArchitectureError) {
    const arch = error.architecture ? ` (${error.architecture})` : "";
    return `Aakar doesn't load custom-code models${arch}. Try a model with a stock HuggingFace architecture.`;
  }
  if (error instanceof NetworkError) {
    return `Network error: ${error.message}`;
  }
  if (error instanceof ApiError) {
    return error.message || `Request failed (HTTP ${error.status}).`;
  }
  return error instanceof Error ? error.message : "Unknown error.";
}
