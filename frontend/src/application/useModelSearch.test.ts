import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ModelSearchRepository } from "./interfaces";
import { useModelSearch } from "./useModelSearch";

const HIT = "openai-community/gpt2";

/** A fake repo that records the queries it was asked for. */
function fakeRepo(results: ReadonlyArray<string> = [HIT]): ModelSearchRepository & {
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
    const { result } = renderHook(() => useModelSearch("g", { repo }));
    await new Promise((r) => setTimeout(r, 20));
    expect(repo.calls).toEqual([]);
    expect(result.current.results).toEqual([]);
  });

  it("fetches and exposes results once the query is long enough", async () => {
    const repo = fakeRepo();
    const { result } = renderHook(() => useModelSearch("gpt2", { repo }));
    await waitFor(() => expect(result.current.results).toEqual([HIT]));
    expect(repo.calls).toEqual(["gpt2"]);
  });

  it("does not search when disabled", async () => {
    const repo = fakeRepo();
    renderHook(() => useModelSearch("gpt2", { repo, enabled: false }));
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
