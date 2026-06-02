/**
 * Use case: fetch trending Hub models for the example/quick-model chips.
 * Errors are non-fatal — the chips just hide rather than showing a broken UI.
 *
 * Trending is a single logical dataset that several places render at different
 * counts (the nav strip wants 6, the hero/CTA chips want 5). Rather than let
 * each consumer fire its own request — which made the home page hit
 * `/api/models?sort=trending` once per consumer, doubled again by StrictMode's
 * dev double-invoke — we coalesce: the first caller per (repo, sort) kicks off
 * one fetch of the canonical list, every concurrent caller shares that same
 * in-flight promise, and each slices it down to the count it needs. The entry
 * is dropped once the promise settles, so a genuine later remount re-fetches
 * fresh (preserving the repository's `no-store` intent).
 */

import { useEffect, useState } from "react";

import { HttpTrendingRepository } from "../infrastructure/api/HttpTrendingRepository";
import type { TrendingModel } from "../domain/trending";
import type { TrendingRepository } from "./interfaces";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const defaultRepo: TrendingRepository = new HttpTrendingRepository(API_URL);

/** Canonical fetch size — large enough to cover every consumer's display count
 * so they all share one request. Grows if a caller ever asks for more. */
const CANONICAL_LIMIT = 12;

type InFlight = {
  limit: number;
  promise: Promise<ReadonlyArray<TrendingModel>>;
};

// Per-repository (so injected fakes stay isolated), per-sort coalescing of the
// in-flight trending request. WeakMap → no leak when a repo is discarded.
const inFlight = new WeakMap<TrendingRepository, Map<string, InFlight>>();

/**
 * Return a shared promise for the trending list under `sort`, fetching at least
 * `want` items. Concurrent callers reuse the same in-flight request; the entry
 * clears once settled so later mounts fetch fresh.
 */
function loadTrending(
  repo: TrendingRepository,
  sort: string,
  want: number,
): Promise<ReadonlyArray<TrendingModel>> {
  let bySort = inFlight.get(repo);
  if (!bySort) {
    bySort = new Map();
    inFlight.set(repo, bySort);
  }

  const existing = bySort.get(sort);
  if (existing && existing.limit >= want) return existing.promise;

  const limit = Math.max(want, CANONICAL_LIMIT);
  const promise = repo.fetchTrending({ sort, limit });
  const entry: InFlight = { limit, promise };
  bySort.set(sort, entry);

  // Drop the cached entry once settled (success or failure), but only if it's
  // still the current one — a larger request may have replaced it meanwhile.
  const clear = () => {
    if (bySort!.get(sort) === entry) bySort!.delete(sort);
  };
  promise.then(clear, clear);

  return promise;
}

export type TrendingState = Readonly<{
  models: ReadonlyArray<TrendingModel>;
  loading: boolean;
  error: boolean;
}>;

export function useTrendingModels(
  limit = CANONICAL_LIMIT,
  repo: TrendingRepository = defaultRepo,
): TrendingState {
  const [state, setState] = useState<TrendingState>({ models: [], loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    setState({ models: [], loading: true, error: false });
    loadTrending(repo, "trending", limit).then(
      (models) => {
        // Slice to this consumer's display count — the shared list may hold more.
        if (!cancelled) setState({ models: models.slice(0, limit), loading: false, error: false });
      },
      () => {
        if (!cancelled) setState({ models: [], loading: false, error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [limit, repo]);

  return state;
}
