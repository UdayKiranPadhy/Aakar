import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useRetryLoad } from "./useRetryLoad";
import { useArchStore } from "../store/archStore";
import type { LoadError } from "./loadError";

const err = (modelId?: string): LoadError =>
  ({ kind: "server_error", title: "x", detail: "y", modelId }) as LoadError;

describe("useRetryLoad", () => {
  it("retries the failed model id and reports canRetry", () => {
    useArchStore.setState({ error: err("gpt2"), requestedModelId: null });
    const loadModel = vi.fn();
    const { result } = renderHook(() => useRetryLoad(loadModel));
    expect(result.current.canRetry).toBe(true);
    act(() => result.current.retry());
    expect(loadModel).toHaveBeenCalledWith("gpt2");
  });

  it("falls back to requestedModelId, and is disabled when neither is known", () => {
    useArchStore.setState({ error: null, requestedModelId: "Qwen/Qwen2-0.5B" });
    const loadModel = vi.fn();
    const { result, rerender } = renderHook(() => useRetryLoad(loadModel));
    act(() => result.current.retry());
    expect(loadModel).toHaveBeenCalledWith("Qwen/Qwen2-0.5B");

    useArchStore.setState({ error: null, requestedModelId: null });
    rerender();
    expect(result.current.canRetry).toBe(false);
  });
});
