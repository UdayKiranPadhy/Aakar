/**
 * Use case: re-run the last model load after a failure.
 *
 * A retry is just `loadModel` called again with the same id — `loadModel` already
 * resets state, re-records the requested id, and re-fetches — so this hook adds no
 * fetch logic. The target id survives a failure in `error.modelId` (and the
 * requested id), so a retry works straight off the error page.
 */

import { useCallback } from "react";

import { useArchStore } from "../store/archStore";

export function useRetryLoad(loadModel: (modelId: string, token?: string) => void) {
  const requestedModelId = useArchStore((s) => s.requestedModelId);
  const errorModelId = useArchStore((s) => s.error?.modelId);
  const targetId = errorModelId ?? requestedModelId ?? null;

  const retry = useCallback(() => {
    if (targetId) loadModel(targetId);
  }, [loadModel, targetId]);

  return { canRetry: targetId != null, retry };
}
