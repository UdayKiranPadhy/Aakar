import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useTrendingModels } from "./useTrendingModels";
import type { TrendingRepository } from "./interfaces";
import type { TrendingModel } from "../domain/trending";

function model(id: string): TrendingModel {
  return { model_id: id, tags: [] };
}

const list = Array.from({ length: 12 }, (_, i) => model(`org/model-${i}`));

/** A repository whose single in-flight fetch is resolved manually, so multiple
 * consumers can mount *while it's pending* — exactly the home-page scenario. */
function deferredRepo() {
  const calls: Array<{ sort?: string; limit?: number }> = [];
  let resolve!: (m: ReadonlyArray<TrendingModel>) => void;
  const repo: TrendingRepository = {
    fetchTrending: vi.fn((opts = {}) => {
      calls.push(opts);
      return new Promise<ReadonlyArray<TrendingModel>>((r) => {
        resolve = r;
      });
    }),
  };
  return { repo, calls, resolveWith: (m: ReadonlyArray<TrendingModel>) => resolve(m) };
}

describe("useTrendingModels coalescing", () => {
  it("shares one in-flight request across concurrent consumers, slicing per limit", async () => {
    const { repo, calls, resolveWith } = deferredRepo();

    // Two consumers (e.g. Hero chips @5 and the nav strip @6) mount while the
    // request is pending — the home-page case that previously fired 4×.
    const hero = renderHook(() => useTrendingModels(5, repo));
    const nav = renderHook(() => useTrendingModels(6, repo));

    // Only ONE network call, fetched at the canonical size (≥ the largest want).
    expect(repo.fetchTrending).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.limit ?? 0).toBeGreaterThanOrEqual(6);

    await act(async () => {
      resolveWith(list);
    });

    // Each consumer slices the shared list to the count it asked for.
    await waitFor(() => expect(hero.result.current.loading).toBe(false));
    expect(hero.result.current.models).toHaveLength(5);
    expect(nav.result.current.models).toHaveLength(6);
    expect(nav.result.current.models[0]?.model_id).toBe("org/model-0");
  });

  it("re-fetches once the previous request has settled (fresh on remount)", async () => {
    const { repo, resolveWith } = deferredRepo();

    const first = renderHook(() => useTrendingModels(5, repo));
    await act(async () => {
      resolveWith(list);
    });
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(repo.fetchTrending).toHaveBeenCalledTimes(1);

    // A genuine later mount (after settle) fetches again — the entry was cleared.
    renderHook(() => useTrendingModels(5, repo));
    expect(repo.fetchTrending).toHaveBeenCalledTimes(2);
  });
});
