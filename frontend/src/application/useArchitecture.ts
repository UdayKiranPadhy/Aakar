/**
 * Use case: load a model's architecture into the store.
 *
 * The repository is injected (not constructed inside the hook) so tests pass
 * a stub. The hook itself is thin — it orchestrates store transitions and
 * translates infrastructure errors into user-facing messages.
 */

import { useCallback } from "react";

import { useArchStore } from "../store/archStore";
import { toLoadError } from "./loadError";
import type { ArchitectureRepository } from "./interfaces";

export function useArchitecture(repo: ArchitectureRepository) {
  const reset = useArchStore((s) => s.reset);
  const setLoading = useArchStore((s) => s.setLoading);
  const setSpec = useArchStore((s) => s.setSpec);
  const setError = useArchStore((s) => s.setError);
  const setAppMode = useArchStore((s) => s.setAppMode);

  const loadModel = useCallback(
    async (modelId: string): Promise<void> => {
      const trimmed = modelId.trim();
      if (!trimmed) return;
      reset();
      // Switch to the model dashboard up-front so the user sees the loading
      // state there, not on the Home view. On error we stay in the dashboard
      // (the pill's inline error remains visible regardless of mode).
      setAppMode("model");
      setLoading(true);
      try {
        const spec = await repo.fetch(trimmed);
        setSpec(spec);
      } catch (e) {
        setError(toLoadError(e));
      }
    },
    [repo, reset, setLoading, setSpec, setError, setAppMode],
  );

  return { loadModel };
}
