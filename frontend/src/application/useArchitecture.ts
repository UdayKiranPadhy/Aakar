/**
 * Use case: load a model's architecture into the store.
 *
 * The repository is injected (not constructed inside the hook) so tests pass
 * a stub. The hook itself is thin — it orchestrates store transitions and
 * translates infrastructure errors into user-facing messages.
 */

import { useCallback } from "react";

import { useArchStore } from "../store/archStore";
import {
  ApiError,
  ModelGatedError,
  ModelNotFoundError,
  NetworkError,
  UnsupportedConfigError,
  UpstreamTimeoutError,
} from "../infrastructure/api/errors";
import type { ArchitectureRepository } from "./interfaces";

function toUserMessage(error: unknown): string {
  if (error instanceof ModelNotFoundError) {
    return `Model not found or unavailable: ${error.modelId}`;
  }
  if (error instanceof ModelGatedError) {
    return `Model is gated or private (Aakar uses no HuggingFace token): ${error.modelId}`;
  }
  if (error instanceof UpstreamTimeoutError) {
    return "HuggingFace took too long to respond. Try again.";
  }
  if (error instanceof UnsupportedConfigError) {
    return `Model config is missing required field "${error.missingField}".`;
  }
  if (error instanceof NetworkError) {
    return `Network error: ${error.message}`;
  }
  if (error instanceof ApiError) {
    return error.message || `Request failed (HTTP ${error.status}).`;
  }
  return error instanceof Error ? error.message : "Unknown error.";
}

export function useArchitecture(repo: ArchitectureRepository) {
  const reset = useArchStore((s) => s.reset);
  const setLoading = useArchStore((s) => s.setLoading);
  const setSpec = useArchStore((s) => s.setSpec);
  const setError = useArchStore((s) => s.setError);
  const setView = useArchStore((s) => s.setView);

  const loadModel = useCallback(
    async (modelId: string): Promise<void> => {
      const trimmed = modelId.trim();
      if (!trimmed) return;
      reset();
      // Switch to the visualizer up-front so the user sees the loading state
      // there, not on the Home view. On error we stay on visualizer (the
      // pill's inline error remains visible regardless of view).
      setView("visualizer");
      setLoading(true);
      try {
        const spec = await repo.fetch(trimmed);
        setSpec(spec);
      } catch (e) {
        setError(toUserMessage(e));
      }
    },
    [repo, reset, setLoading, setSpec, setError, setView],
  );

  return { loadModel };
}
