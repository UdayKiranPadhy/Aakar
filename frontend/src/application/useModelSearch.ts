/**
 * Use case: live model-search suggestions for the search bar's autocomplete.
 *
 * Debounces keystrokes and aborts the in-flight request when the query changes
 * (or the component unmounts), so fast typing collapses to a single trailing
 * Hub request and stays well under the Hub's unauthenticated rate cap. Errors
 * are non-fatal — the dropdown just shows nothing rather than a broken UI.
 */

import { useEffect, useState } from "react";

import { HfModelSearchRepository } from "../infrastructure/api/HfModelSearchRepository";
import type { ModelSummary } from "../domain/modelSearch";
import type { ModelSearchRepository } from "./interfaces";

const defaultRepo: ModelSearchRepository = new HfModelSearchRepository();

/** Below this many (trimmed) characters we don't search — avoids firing on a
 *  single keystroke and keeps request volume sane. */
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

export type ModelSearchState = Readonly<{
  results: ReadonlyArray<ModelSummary>;
  loading: boolean;
}>;

type Options = {
  /** Skip searching entirely (e.g. the dropdown is closed). */
  enabled?: boolean;
  limit?: number;
  debounceMs?: number;
  /** Injectable for tests; defaults to the live HF Hub search. */
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

    // Show the spinner straight away (keeping any prior results visible to avoid
    // a flicker), but defer the request until typing settles, and abort whatever
    // is in flight when it does.
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
