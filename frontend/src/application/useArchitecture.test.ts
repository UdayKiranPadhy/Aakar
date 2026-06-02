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

  it("switches to the model dashboard before fetching", async () => {
    const repo = fakeRepo(sampleSpec);
    useArchStore.setState({ appMode: "home" });
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt2");
    });
    expect(useArchStore.getState().appMode).toBe("model");
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

  it("maps ModelNotFoundError to a not_found load error carrying the id", async () => {
    const repo = fakeRepo(new ModelNotFoundError("gpt-99", "not found"));
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt-99");
    });
    const err = useArchStore.getState().error;
    expect(err?.kind).toBe("not_found");
    expect(err?.modelId).toBe("gpt-99");
  });

  it("maps ModelGatedError to a gated load error", async () => {
    const repo = fakeRepo(new ModelGatedError("meta-llama/Llama-3-70B", "gated"));
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("meta-llama/Llama-3-70B");
    });
    const err = useArchStore.getState().error;
    expect(err?.kind).toBe("gated");
    expect(`${err?.title} ${err?.hint}`).toMatch(/gated|private/i);
  });

  it("maps UnsupportedArchitectureError, keeping the architecture + a custom-code hint", async () => {
    const repo = fakeRepo(
      new UnsupportedArchitectureError("custom/model", "DeepSeekV3", "unsupported"),
    );
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("custom/model");
    });
    const err = useArchStore.getState().error;
    expect(err?.kind).toBe("unsupported");
    expect(err?.architecture).toBe("DeepSeekV3");
    expect(err?.hint).toMatch(/custom[- ]code|trust_remote_code/i);
  });

  it("maps NetworkError to a network load error", async () => {
    const repo = fakeRepo(new NetworkError("Failed to fetch"));
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt2");
    });
    const err = useArchStore.getState().error;
    expect(err?.kind).toBe("network");
    expect(err?.detail).toMatch(/failed to fetch/i);
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
