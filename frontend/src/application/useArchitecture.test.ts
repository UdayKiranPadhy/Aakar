import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useArchitecture } from "./useArchitecture";
import type { ArchitectureRepository } from "./interfaces";
import { useArchStore } from "../store/archStore";
import type { Spec } from "../domain/spec";
import {
  ModelGatedError,
  ModelNotFoundError,
  NetworkError,
  UnsupportedArchitectureError,
} from "../infrastructure/api/errors";

const sampleSpec: Spec = {
  model_id: "gpt2",
  model_type: "gpt2",
  config_summary: { hidden_size: 768 },
  graph: [
    { id: "embed", type: "token_embedding", label: "Token embedding", params: {} },
  ],
};

function fakeRepo(spec: Spec | Promise<Spec> | Error): ArchitectureRepository {
  return {
    fetch: vi.fn(async () => {
      if (spec instanceof Error) throw spec;
      return spec instanceof Promise ? spec : spec;
    }),
  };
}

describe("useArchitecture.loadModel", () => {
  it("rejects empty / whitespace input without calling the repository", async () => {
    const repo = fakeRepo(sampleSpec);
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("   ");
    });
    expect(repo.fetch).not.toHaveBeenCalled();
  });

  it("switches the view to visualizer before fetching", async () => {
    const repo = fakeRepo(sampleSpec);
    useArchStore.setState({ view: "home" });
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt2");
    });
    expect(useArchStore.getState().view).toBe("visualizer");
  });

  it("stores the spec on success and clears loading", async () => {
    const repo = fakeRepo(sampleSpec);
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt2");
    });
    const s = useArchStore.getState();
    expect(s.spec?.model_id).toBe("gpt2");
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  it("trims the model id before passing it to the repository", async () => {
    const repo = fakeRepo(sampleSpec);
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("  gpt2  ");
    });
    expect(repo.fetch).toHaveBeenCalledWith("gpt2");
  });

  it("translates ModelNotFoundError into a user-facing message", async () => {
    const repo = fakeRepo(new ModelNotFoundError("gpt-99", "not found"));
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt-99");
    });
    expect(useArchStore.getState().error).toContain("gpt-99");
  });

  it("translates ModelGatedError into a 'gated or private' message", async () => {
    const repo = fakeRepo(new ModelGatedError("meta-llama/Llama-3-70B", "gated"));
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("meta-llama/Llama-3-70B");
    });
    expect(useArchStore.getState().error).toMatch(/gated|private/i);
  });

  it("translates UnsupportedArchitectureError into a custom-code warning", async () => {
    const repo = fakeRepo(
      new UnsupportedArchitectureError("custom/model", "DeepSeekV3", "unsupported"),
    );
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("custom/model");
    });
    const msg = useArchStore.getState().error ?? "";
    expect(msg).toMatch(/custom[- ]code/i);
    expect(msg).toContain("DeepSeekV3");
  });

  it("translates NetworkError to a 'Network error' message", async () => {
    const repo = fakeRepo(new NetworkError("Failed to fetch"));
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt2");
    });
    expect(useArchStore.getState().error).toMatch(/network error/i);
  });

  it("resets state (selection/expansion/loading) before each fetch", async () => {
    const repo = fakeRepo(sampleSpec);
    useArchStore.setState({
      expansionPath: ["leftover"],
      selectionPath: ["leftover"],
      detailOpen: true,
    });
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt2");
    });
    const s = useArchStore.getState();
    expect(s.expansionPath).toEqual([]);
    expect(s.selectionPath).toEqual([]);
  });
});
