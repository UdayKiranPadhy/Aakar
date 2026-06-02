import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuickModels } from "./QuickModels";
import { useArchStore } from "../../store/archStore";
import type { Spec } from "../../domain/spec";

// Trending is fetched; stub it with a fixed list so the chips are deterministic.
vi.mock("../../application/useTrendingModels", () => ({
  useTrendingModels: () => ({
    models: [
      { model_id: "openai-community/gpt2", tags: [] },
      { model_id: "mistralai/Mistral-7B-v0.1", tags: [] },
    ],
    loading: false,
    error: false,
  }),
}));

const gpt2Spec: Spec = {
  model_id: "openai-community/gpt2",
  model_type: "gpt2",
  config_summary: {},
  graph: [],
};

beforeEach(() => {
  useArchStore.setState({ spec: null, appMode: "home", modelInput: "", loading: false });
});

describe("QuickModels", () => {
  it("renders a chip per trending model, labelled by the short name", () => {
    render(<QuickModels onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "gpt2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mistral-7B-v0.1" })).toBeInTheDocument();
  });

  it("clicking a chip whose model isn't loaded calls onSubmit with the full id", async () => {
    const onSubmit = vi.fn();
    render(<QuickModels onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "gpt2" }));
    expect(onSubmit).toHaveBeenCalledWith("openai-community/gpt2");
    expect(useArchStore.getState().modelInput).toBe("openai-community/gpt2");
  });

  it("when the model is already loaded, clicking just switches to its dashboard", async () => {
    useArchStore.setState({ spec: gpt2Spec, appMode: "home" });
    const onSubmit = vi.fn();
    render(<QuickModels onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "gpt2" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(useArchStore.getState().appMode).toBe("model");
  });

  it("marks the chip active when its model is loaded in the dashboard", () => {
    useArchStore.setState({ spec: gpt2Spec, appMode: "model" });
    render(<QuickModels onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "gpt2" })).toHaveAttribute("aria-current", "page");
  });

  it("disables every chip while a model is loading", () => {
    useArchStore.setState({ loading: true });
    render(<QuickModels onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "gpt2" })).toBeDisabled();
  });
});
