import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ModelGatedState } from "./ModelGatedState";
import type { LoadError } from "../../application/loadError";
import { useArchStore } from "../../store/archStore";

const error: LoadError = {
  kind: "gated",
  title: "Gated or private model",
  detail: "Model is gated or private: 'meta-llama/Llama-3-8B'",
  modelId: "meta-llama/Llama-3-8B",
  status: 403,
};

afterEach(() => {
  // The token form persists to the store/localStorage on submit — reset so
  // tests don't leak a remembered token into each other.
  useArchStore.setState({ hfToken: null });
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

describe("ModelGatedState", () => {
  it("shows the heading, the model chip, and the illustration", () => {
    const { container } = render(<ModelGatedState error={error} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /gated or private model/i })).toBeInTheDocument();
    expect(screen.getByText("meta-llama/Llama-3-8B")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("offers a token form and a community-mirror alternative (unsloth/)", () => {
    render(<ModelGatedState error={error} />);
    expect(screen.getByLabelText(/huggingface read token/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /access model/i })).toBeInTheDocument();
    expect(screen.getByText(/remember token locally/i)).toBeInTheDocument();
    expect(screen.getByText(/community mirror/i)).toBeInTheDocument();
    expect(screen.getByText("unsloth/")).toBeInTheDocument();
  });

  it("retries with the entered token", () => {
    const onRetry = vi.fn();
    render(<ModelGatedState error={error} onRetryWithToken={onRetry} />);
    fireEvent.change(screen.getByLabelText(/huggingface read token/i), {
      target: { value: "hf_abc123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /access model/i }));
    expect(onRetry).toHaveBeenCalledWith("meta-llama/Llama-3-8B", "hf_abc123");
    // ...and it is remembered for later searches.
    expect(useArchStore.getState().hfToken).toBe("hf_abc123");
  });

  it("disables the Access Model button until a token is entered", () => {
    render(<ModelGatedState error={error} />);
    expect(screen.getByRole("button", { name: /access model/i })).toBeDisabled();
  });
});
