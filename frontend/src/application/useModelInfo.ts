/**
 * Use case: load a model's HuggingFace Hub metadata + README.
 *
 * Fetches metadata and README directly from the HuggingFace Hub API (no
 * backend proxy). A README failure is non-fatal (the card is optional), but
 * a metadata failure surfaces an error. The repository is injectable so
 * tests pass a fake.
 */

import { useEffect, useState } from "react";

import { HttpModelInfoRepository } from "../infrastructure/api/HttpModelInfoRepository";
import type { ModelInfo } from "../domain/modelInfo";
import { toUserMessage } from "./errorMessage";
import type { ModelInfoRepository } from "./interfaces";

const defaultRepo: ModelInfoRepository = new HttpModelInfoRepository();

export type ModelInfoState = Readonly<{
  info: ModelInfo | null;
  readme: string | null;
  loading: boolean;
  error: string | null;
}>;

const EMPTY: ModelInfoState = { info: null, readme: null, loading: false, error: null };

export function useModelInfo(
  modelId: string | undefined,
  repo: ModelInfoRepository = defaultRepo,
): ModelInfoState {
  const [state, setState] = useState<ModelInfoState>(EMPTY);

  useEffect(() => {
    if (!modelId) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState({ info: null, readme: null, loading: true, error: null });
    Promise.allSettled([repo.fetchInfo(modelId), repo.fetchReadme(modelId)]).then(
      ([infoRes, readmeRes]) => {
        if (cancelled) return;
        if (infoRes.status === "rejected") {
          setState({ info: null, readme: null, loading: false, error: toUserMessage(infoRes.reason) });
          return;
        }
        setState({
          info: infoRes.value,
          readme: readmeRes.status === "fulfilled" ? readmeRes.value : null,
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
