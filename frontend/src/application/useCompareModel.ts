/**
 * Use case: load a second model into the store's `compareSpec` slot, without
 * leaving the Compare view (unlike the primary `loadModel`, which switches to
 * the model dashboard).
 */

import { useCallback, useState } from "react";

import { HttpArchitectureRepository } from "../infrastructure/api/HttpArchitectureRepository";
import { useArchStore } from "../store/archStore";
import { toUserMessage } from "./errorMessage";
import type { ArchitectureRepository } from "./interfaces";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const defaultRepo: ArchitectureRepository = new HttpArchitectureRepository(API_URL);

export function useCompareModel(repo: ArchitectureRepository = defaultRepo) {
  const setCompareSpec = useArchStore((s) => s.setCompareSpec);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (modelId: string): Promise<void> => {
      const trimmed = modelId.trim();
      if (!trimmed) return;
      setLoading(true);
      setError(null);
      try {
        setCompareSpec(await repo.fetch(trimmed));
      } catch (e) {
        setError(toUserMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [repo, setCompareSpec],
  );

  return { load, loading, error };
}
