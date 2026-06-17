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
  const setRequestedModelId = useArchStore((s) => s.setRequestedModelId);
  const hfToken = useArchStore((s) => s.hfToken);

  // Background upgrade: pull the forward-pass operations and swap in the enriched
  // spec. The trace is the slow part of introspection, so it must never block the
  // first paint — the tree is already on screen; ops stream in and the op-flow view
  // / forward-op panels light up when they land. Best-effort: on failure the
  // structure spec stays and those op-only surfaces simply don't appear.
  const loadOperations = useCallback(
    async (modelId: string, token: string | undefined): Promise<void> => {
      try {
        const enriched = await repo.fetchOperations(modelId, token);
        // Only swap if this is still the model on screen — the user may have moved on.
        if (useArchStore.getState().requestedModelId === modelId) setSpec(enriched);
      } catch {
        /* non-fatal — operations are an enhancement over the structure view */
      }
    },
    [repo, setSpec],
  );

  const loadModel = useCallback(
    // `tokenOverride` lets the gated page retry with a just-entered token
    // (before the store-backed value re-renders the hook). Otherwise the
    // remembered store token (if any) is used; gated models need it.
    async (modelId: string, tokenOverride?: string): Promise<void> => {
      const trimmed = modelId.trim();
      if (!trimmed) return;
      reset();
      // Record the target id before fetching so the URL can show `/model?id=…`
      // throughout the load window (reset() cleared it; set it back here).
      setRequestedModelId(trimmed);
      // Switch to the model dashboard up-front so the user sees the loading
      // state there, not on the Home view. On error we stay in the dashboard
      // (the pill's inline error remains visible regardless of mode).
      setAppMode("model");
      setLoading(true);
      const token = tokenOverride ?? hfToken ?? undefined;
      try {
        const spec = await repo.fetch(trimmed, token);
        setSpec(spec);
        // Fire-and-forget the operations fetch; never awaited, so it can't delay paint.
        if (!spec.operations_traced) void loadOperations(trimmed, token);
      } catch (e) {
        setError(toLoadError(e));
      }
    },
    [
      repo,
      hfToken,
      reset,
      setLoading,
      setSpec,
      setError,
      setAppMode,
      setRequestedModelId,
      loadOperations,
    ],
  );

  return { loadModel };
}
