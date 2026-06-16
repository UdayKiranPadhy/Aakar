import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ModelSummary } from "../domain/modelSearch";
import type { ModelSearchRepository } from "./interfaces";
import { useModelSearch } from "./useModelSearch";

const hit: ModelSummary = {
  id: "openai-community/gpt2",
  downloads: 1,
  likes: 1,
  pipelineTag: "text-generation",
};

/** A fake repo that records the queries it was asked for. */
function fakeRepo(results: ReadonlyArray<ModelSummary> = [hit]): ModelSearchRepository & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    async search(query) {
      calls.push(query);
      return results;
    },
  };
}

describe("useModelSearch", () => {
  it("does not search below the minimum query length", async () => {
    const repo = fakeRepo();
    const { result } = renderHook(() => useModelSearch("g", { repo, debounceMs: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(repo.calls).toEqual([]);
    expect(result.current.results).toEqual([]);
  });

  it("fetches and exposes results once the query is long enough", async () => {
    const repo = fakeRepo();
    const { result } = renderHook(() => useModelSearch("gpt2", { repo, debounceMs: 0 }));
    await waitFor(() => expect(result.current.results).toEqual([hit]));
    expect(repo.calls).toEqual(["gpt2"]);
  });

  it("does not search when disabled", async () => {
    const repo = fakeRepo();
    renderHook(() => useModelSearch("gpt2", { repo, enabled: false, debounceMs: 0 }));
    await new Promise((r) => setTimeout(r, 20));
    expect(repo.calls).toEqual([]);
  });

  it("collapses rapid keystrokes into a single trailing request (debounce)", async () => {
    const repo = fakeRepo();
    const { rerender } = renderHook(({ q }) => useModelSearch(q, { repo, debounceMs: 50 }), {
      initialProps: { q: "gp" },
    });
    rerender({ q: "gpt" });
    rerender({ q: "gpt2" });
    // Still inside the debounce window — nothing fired yet.
    expect(repo.calls).toEqual([]);
    await waitFor(() => expect(repo.calls).toEqual(["gpt2"]));
  });
});
