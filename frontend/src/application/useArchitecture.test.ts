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
  // Already traced ⇒ loadModel won't fire the background operations fetch, keeping
  // the error/state-transition tests below free of an extra async swap.
  operations_traced: true,
};

function fakeRepo(spec: Spec | Promise<Spec> | Error): ArchitectureRepository {
  const impl = async () => {
    if (spec instanceof Error) throw spec;
    return spec instanceof Promise ? spec : spec;
  };
  // Separate mocks so a call to one isn't counted against the other.
  return { fetch: vi.fn(impl), fetchOperations: vi.fn(impl) };
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
    expect(repo.fetch).toHaveBeenCalledWith("gpt2", undefined);
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

  it("prefetches operations in the background and swaps in the traced spec", async () => {
    const structure: Spec = { ...sampleSpec, operations_traced: false };
    const traced: Spec = { ...sampleSpec, operations_traced: true };
    const repo: ArchitectureRepository = {
      fetch: vi.fn(async () => structure),
      fetchOperations: vi.fn(async () => traced),
    };
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt2");
    });
    // The structure is fetched and the operations call is fired in the background.
    expect(repo.fetch).toHaveBeenCalledWith("gpt2", undefined);
    expect(repo.fetchOperations).toHaveBeenCalledWith("gpt2", undefined);
    // Flush the background fetch's microtasks; the enriched spec is then swapped in.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(useArchStore.getState().spec?.operations_traced).toBe(true);
  });

  it("skips the operations prefetch when the spec is already traced", async () => {
    const repo = fakeRepo(sampleSpec); // sampleSpec.operations_traced === true
    const { result } = renderHook(() => useArchitecture(repo));
    await act(async () => {
      await result.current.loadModel("gpt2");
    });
    expect(repo.fetchOperations).not.toHaveBeenCalled();
  });
});
