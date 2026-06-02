/**
 * Use cases for the Research view + source viewer.
 *   - useResearch(modelId): the model's paper(s) + linked repo (repo is
 *     best-effort, non-fatal).
 *   - useSource(url): the source slice behind a module's source_url (lazy —
 *     pass undefined until the user opts in).
 */

import { useEffect, useState } from "react";

import { HttpResearchRepository } from "../infrastructure/api/HttpResearchRepository";
import type { Paper, RepoInfo, SourceSnippet } from "../domain/research";
import { toUserMessage } from "./errorMessage";
import type { ResearchRepository } from "./interfaces";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const defaultRepo: ResearchRepository = new HttpResearchRepository(API_URL);

export type ResearchState = Readonly<{
  papers: ReadonlyArray<Paper>;
  repo: RepoInfo | null;
  loading: boolean;
  error: string | null;
}>;

const EMPTY: ResearchState = { papers: [], repo: null, loading: false, error: null };

export function useResearch(
  modelId: string | undefined,
  repo: ResearchRepository = defaultRepo,
): ResearchState {
  const [state, setState] = useState<ResearchState>(EMPTY);

  useEffect(() => {
    if (!modelId) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState({ papers: [], repo: null, loading: true, error: null });
    Promise.allSettled([repo.fetchPapers(modelId), repo.fetchRepo(modelId)]).then(
      ([papersRes, repoRes]) => {
        if (cancelled) return;
        if (papersRes.status === "rejected") {
          setState({ papers: [], repo: null, loading: false, error: toUserMessage(papersRes.reason) });
          return;
        }
        setState({
          papers: papersRes.value,
          repo: repoRes.status === "fulfilled" ? repoRes.value : null,
          loading: false,
          error: null,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [modelId, repo]);

  return state;
}

export type SourceState = Readonly<{
  snippet: SourceSnippet | null;
  loading: boolean;
  error: string | null;
}>;

export function useSource(
  url: string | undefined,
  repo: ResearchRepository = defaultRepo,
): SourceState {
  const [state, setState] = useState<SourceState>({ snippet: null, loading: false, error: null });

  useEffect(() => {
    if (!url) {
      setState({ snippet: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ snippet: null, loading: true, error: null });
    repo.fetchSource(url).then(
      (snippet) => {
        if (!cancelled) setState({ snippet, loading: false, error: null });
      },
      (e) => {
        if (!cancelled) setState({ snippet: null, loading: false, error: toUserMessage(e) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url, repo]);

  return state;
}
