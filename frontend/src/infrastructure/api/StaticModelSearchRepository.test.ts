import { describe, expect, it } from "vitest";

import { StaticModelSearchRepository } from "./StaticModelSearchRepository";

// A small, deliberately-ordered fake list (most "popular" first) so the order
// and substring assertions don't depend on the generated production data.
const MODELS = [
  "openai-community/gpt2",
  "openai-community/gpt2-large",
  "meta-llama/Llama-3.1-8B-Instruct",
  "Qwen/Qwen3-0.6B",
  "unsloth/llama-3-8b-bnb-4bit",
];

describe("StaticModelSearchRepository", () => {
  const repo = new StaticModelSearchRepository(MODELS);

  it("returns [] for a blank query", async () => {
    expect(await repo.search("   ")).toEqual([]);
  });

  it("matches case-insensitively on any substring of the id", async () => {
    expect(await repo.search("LLAMA")).toEqual([
      "meta-llama/Llama-3.1-8B-Instruct",
      "unsloth/llama-3-8b-bnb-4bit",
    ]);
  });

  it("preserves the underlying (popularity) order", async () => {
    expect(await repo.search("gpt2")).toEqual([
      "openai-community/gpt2",
      "openai-community/gpt2-large",
    ]);
  });

  it("respects the limit, taking the most popular matches first", async () => {
    expect(await repo.search("o", { limit: 1 })).toEqual(["openai-community/gpt2"]);
  });

  it("defaults to the bundled popular-models list", async () => {
    // 'a' appears in a great many ids, so this is stable regardless of refreshes.
    const res = await new StaticModelSearchRepository().search("a", { limit: 5 });
    expect(res).toHaveLength(5);
  });
});
