/**
 * Use case: model-search suggestions for the search bar's autocomplete.
 *
 * Debounces query changes and ignores superseded (aborted) requests, so the
 * dropdown stays responsive regardless of the search source. The default source
 * is a bundled, popularity-ranked id list filtered in memory (no network call),
 * but any `ModelSearchRepository` can be injected. Errors are non-fatal — the
 * dropdown just shows nothing rather than a broken UI.
 */

import { useEffect, useState } from "react";

import { StaticModelSearchRepository } from "../infrastructure/api/StaticModelSearchRepository";
import type { ModelSearchRepository } from "./interfaces";

const defaultRepo: ModelSearchRepository = new StaticModelSearchRepository();

/** Below this many (trimmed) characters we don't search — avoids dumping the
 *  whole list on the first keystroke. */
const MIN_QUERY_LENGTH = 2;
// The default source is local/synchronous, so no debounce is needed; a
// network-backed repo can pass a non-zero `debounceMs`.
const DEBOUNCE_MS = 0;

export type ModelSearchState = Readonly<{
  results: ReadonlyArray<string>;
  loading: boolean;
}>;

type Options = {
  /** Skip searching entirely (e.g. the dropdown is closed). */
  enabled?: boolean;
  limit?: number;
  debounceMs?: number;
  /** Injectable for tests; defaults to the bundled popular-models search. */
  repo?: ModelSearchRepository;
};

export function useModelSearch(
  query: string,
  { enabled = true, limit = 8, debounceMs = DEBOUNCE_MS, repo = defaultRepo }: Options = {},
): ModelSearchState {
  const [state, setState] = useState<ModelSearchState>({ results: [], loading: false });

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < MIN_QUERY_LENGTH) {
      setState({ results: [], loading: false });
      return;
    }

    // Keep any prior results visible (no flicker) while the next query settles,
    // and abort whatever is in flight when it does.
    setState((prev) => ({ results: prev.results, loading: true }));
    const controller = new AbortController();
    const timer = setTimeout(() => {
      repo.search(q, { limit, signal: controller.signal }).then(
        (results) => setState({ results, loading: false }),
        () => {
          // Superseded (aborted) requests are expected — ignore them so a newer
          // query in flight isn't clobbered with an empty result set.
          if (!controller.signal.aborted) setState({ results: [], loading: false });
        },
      );
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled, limit, debounceMs, repo]);

  return state;
}
