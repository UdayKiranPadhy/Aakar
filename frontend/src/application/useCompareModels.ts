/**
 * Use case: load the two models compared side by side in the Compare view, each
 * into its own store slot (`compareA` / `compareB`), with independent loading and
 * error state per slot. Unlike the primary `loadModel`, this never switches the
 * app to the model dashboard — Compare is a standalone surface.
 */

import { useCallback, useState } from "react";

import type { CompareSlot } from "../domain/navigation";
import { HttpArchitectureRepository } from "../infrastructure/api/HttpArchitectureRepository";
import { useArchStore } from "../store/archStore";
import { toUserMessage } from "./errorMessage";
import type { ArchitectureRepository } from "./interfaces";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const defaultRepo: ArchitectureRepository = new HttpArchitectureRepository(API_URL);

export type SlotStatus = Readonly<{ loading: boolean; error: string | null }>;

const IDLE: SlotStatus = { loading: false, error: null };

export type CompareModelsApi = Readonly<{
  /** Fetch `modelId` into the given column. No-op for blank input. */
  load(slot: CompareSlot, modelId: string): Promise<void>;
  /** Exchange the two columns (specs and their statuses). */
  swap(): void;
  a: SlotStatus;
  b: SlotStatus;
}>;

export function useCompareModels(
  repo: ArchitectureRepository = defaultRepo,
): CompareModelsApi {
  const setCompareSpec = useArchStore((s) => s.setCompareSpec);
  const setCompareRequested = useArchStore((s) => s.setCompareRequested);
  const [status, setStatus] = useState<Record<CompareSlot, SlotStatus>>({ a: IDLE, b: IDLE });

  const load = useCallback(
    async (slot: CompareSlot, modelId: string): Promise<void> => {
      const trimmed = modelId.trim();
      if (!trimmed) return;
      // Record the target id up-front so a deep-linked `?a=…&b=…` stays intact
      // while one column resolves ahead of the other.
      setCompareRequested(slot, trimmed);
      setStatus((s) => ({ ...s, [slot]: { loading: true, error: null } }));
      try {
        const spec = await repo.fetch(trimmed);
        setCompareSpec(slot, spec);
        setStatus((s) => ({ ...s, [slot]: IDLE }));
      } catch (e) {
        setStatus((s) => ({ ...s, [slot]: { loading: false, error: toUserMessage(e) } }));
      }
    },
    [repo, setCompareSpec, setCompareRequested],
  );

  const swap = useCallback(() => {
    // Read the latest specs at call time (not from a render snapshot).
    const { compareA, compareB, requestedCompareA, requestedCompareB } = useArchStore.getState();
    setCompareSpec("a", compareB);
    setCompareSpec("b", compareA);
    setCompareRequested("a", requestedCompareB);
    setCompareRequested("b", requestedCompareA);
    // Keep each per-bar status with the model it describes.
    setStatus((s) => ({ a: s.b, b: s.a }));
  }, [setCompareSpec, setCompareRequested]);

  return { load, swap, a: status.a, b: status.b };
}
