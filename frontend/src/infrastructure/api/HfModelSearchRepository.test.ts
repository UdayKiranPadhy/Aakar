import { afterEach, describe, expect, it, vi } from "vitest";

import { HfModelSearchRepository } from "./HfModelSearchRepository";
import { ApiError } from "./errors";

describe("HfModelSearchRepository", () => {
  afterEach(() => vi.restoreAllMocks());

  it("queries the Hub /api/models endpoint with the transformers filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "openai-community/gpt2", downloads: 100, likes: 5, pipeline_tag: "text-generation" },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const repo = new HfModelSearchRepository();
    const results = await repo.search("gpt2", { limit: 5 });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe("https://huggingface.co/api/models");
    expect(url.searchParams.get("search")).toBe("gpt2");
    expect(url.searchParams.get("library")).toBe("transformers");
    expect(url.searchParams.get("sort")).toBe("downloads");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(results).toEqual([
      { id: "openai-community/gpt2", downloads: 100, likes: 5, pipelineTag: "text-generation" },
    ]);
  });

  it("returns [] for a blank query without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const repo = new HfModelSearchRepository();
    expect(await repo.search("   ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("defaults missing numeric fields to 0 and the pipeline tag to null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: "acme/tiny" }] }),
    );
    const repo = new HfModelSearchRepository();
    expect(await repo.search("tiny")).toEqual([
      { id: "acme/tiny", downloads: 0, likes: 0, pipelineTag: null },
    ]);
  });

  it("throws ApiError on a non-ok response (e.g. rate limited)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    const repo = new HfModelSearchRepository();
    await expect(repo.search("gpt2")).rejects.toBeInstanceOf(ApiError);
  });

  it("re-throws an AbortError so a superseded request is distinguishable", async () => {
    const abort = new DOMException("aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));
    const repo = new HfModelSearchRepository();
    await expect(repo.search("gpt2")).rejects.toBe(abort);
  });
});
