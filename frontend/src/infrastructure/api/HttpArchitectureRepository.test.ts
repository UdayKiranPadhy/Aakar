import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, ModelNotFoundError, NetworkError } from "./errors";
import { HttpArchitectureRepository } from "./HttpArchitectureRepository";
import type { Spec } from "../../domain/spec";

const successSpec: Spec = {
  model_id: "gpt2",
  model_type: "gpt2",
  config_summary: { hidden_size: 768 },
  graph: [],
};

describe("HttpArchitectureRepository.fetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls the correct URL with the model_id query param", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(successSpec), { status: 200 }),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    await repo.fetch("meta-llama/Llama-3-8B");
    expect(fetch).toHaveBeenCalledOnce();
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url).toBe(
      "http://localhost:8000/api/architecture?model_id=meta-llama%2FLlama-3-8B",
    );
  });

  it("strips a trailing slash from the base URL", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(successSpec), { status: 200 }),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000/");
    await repo.fetch("gpt2");
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(url.startsWith("http://localhost:8000/api/architecture")).toBe(true);
    expect(url).not.toContain("//api");
  });

  it("uses cache: no-store so a stale spec doesn't persist across backend restarts", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(successSpec), { status: 200 }),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    await repo.fetch("gpt2");
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.cache).toBe("no-store");
  });

  it("parses and returns the JSON spec on a 2xx response", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify(successSpec), { status: 200 }),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    const spec = await repo.fetch("gpt2");
    expect(spec.model_id).toBe("gpt2");
    expect(spec.model_type).toBe("gpt2");
  });

  it("wraps a fetch rejection in NetworkError", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    await expect(repo.fetch("gpt2")).rejects.toBeInstanceOf(NetworkError);
  });

  it("translates a 404 with `model_not_found` into ModelNotFoundError", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          kind: "model_not_found",
          message: "Model not found on HuggingFace Hub",
          model_id: "gpt-99",
        }),
        { status: 404 },
      ),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    await expect(repo.fetch("gpt-99")).rejects.toMatchObject({
      name: "ModelNotFoundError",
      modelId: "gpt-99",
    });
  });

  it("translates a 422 with `unsupported_architecture` into UnsupportedArchitectureError", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          kind: "unsupported_architecture",
          message: "Custom arch not supported",
          model_id: "custom/model",
          architecture: "DeepSeekV3",
        }),
        { status: 422 },
      ),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    await expect(repo.fetch("custom/model")).rejects.toMatchObject({
      name: "UnsupportedArchitectureError",
      modelId: "custom/model",
      architecture: "DeepSeekV3",
    });
  });

  it("discriminates on HTTP status even when the body has no `kind`", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ message: "gone", model_id: "ghost/m" }), // no kind
        { status: 404 },
      ),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    await expect(repo.fetch("ghost/m")).rejects.toMatchObject({
      name: "ModelNotFoundError",
      status: 404,
      modelId: "ghost/m",
    });
  });

  it("carries model_id on a generic 5xx ApiError (e.g. 503)", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ kind: "hub_unavailable", message: "down", model_id: "org/m" }),
        { status: 503 },
      ),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    const err = (await repo.fetch("org/m").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(503);
    expect(err.modelId).toBe("org/m");
  });

  it("maps a 400 to a generic ApiError (bad request)", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ kind: "bad_request", message: "invalid" }), { status: 400 }),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    const err = (await repo.fetch("bad id").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
  });

  it("returns generic ApiError when the body has no error code", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    );
    const repo = new HttpArchitectureRepository("http://localhost:8000");
    const err = await repo.fetch("gpt2").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
  });
});
