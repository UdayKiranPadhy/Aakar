import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuickModels } from "./QuickModels";
import { useArchStore } from "../../store/archStore";
import type { Spec } from "../../domain/spec";

const gpt2Spec: Spec = {
  model_id: "gpt2",
  model_type: "gpt2",
  config_summary: {},
  graph: [],
};

describe("QuickModels", () => {
  it("renders every preset model chip", () => {
    render(<QuickModels onSubmit={() => {}} />);
    for (const label of ["GPT-2", "Mistral-7B", "Qwen2.5-7B", "Qwen3-0.6B"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("clicking a chip whose model isn't loaded calls onSubmit with the modelId", async () => {
    const onSubmit = vi.fn();
    render(<QuickModels onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "GPT-2" }));
    expect(onSubmit).toHaveBeenCalledWith("gpt2");
  });

  it("clicking a chip pre-fills the search input", async () => {
    const onSubmit = vi.fn();
    render(<QuickModels onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Qwen3-0.6B" }));
    expect(useArchStore.getState().modelInput).toBe("Qwen/Qwen3-0.6B");
  });

  it("when the model is already loaded, clicking just switches view (no re-fetch)", async () => {
    useArchStore.setState({ spec: gpt2Spec, view: "home" });
    const onSubmit = vi.fn();
    render(<QuickModels onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "GPT-2" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(useArchStore.getState().view).toBe("visualizer");
  });

  it("marks the chip as active when its model is the loaded visualizer model", () => {
    useArchStore.setState({ spec: gpt2Spec, view: "visualizer" });
    render(<QuickModels onSubmit={() => {}} />);
    expect(
      screen.getByRole("button", { name: "GPT-2" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("does NOT mark the chip as active when view is home (even if spec matches)", () => {
    useArchStore.setState({ spec: gpt2Spec, view: "home" });
    render(<QuickModels onSubmit={() => {}} />);
    expect(
      screen.getByRole("button", { name: "GPT-2" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("disables every chip while the store is loading", () => {
    useArchStore.setState({ loading: true });
    render(<QuickModels onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "GPT-2" })).toBeDisabled();
  });
});
