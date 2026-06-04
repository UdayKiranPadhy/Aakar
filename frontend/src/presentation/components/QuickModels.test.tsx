import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuickModels } from "./QuickModels";
import { useArchStore } from "../../store/archStore";
import type { Spec } from "../../domain/spec";

const FLASH_ID = "deepseek-ai/DeepSeek-V4-Flash";

const flashSpec: Spec = {
  model_id: FLASH_ID,
  model_type: "deepseek_v3",
  config_summary: {},
  graph: [],
};

beforeEach(() => {
  useArchStore.setState({ spec: null, appMode: "home", modelInput: "", loading: false });
});

describe("QuickModels", () => {
  it("renders a chip per featured model, labelled by the short name", () => {
    render(<QuickModels onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "DeepSeek-V4-Flash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mistral-Medium-3.5-128B" })).toBeInTheDocument();
  });

  it("clicking a chip whose model isn't loaded calls onSubmit with the full id", async () => {
    const onSubmit = vi.fn();
    render(<QuickModels onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "DeepSeek-V4-Flash" }));
    expect(onSubmit).toHaveBeenCalledWith(FLASH_ID);
    expect(useArchStore.getState().modelInput).toBe(FLASH_ID);
  });

  it("when the model is already loaded, clicking just switches to its dashboard", async () => {
    useArchStore.setState({ spec: flashSpec, appMode: "home" });
    const onSubmit = vi.fn();
    render(<QuickModels onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "DeepSeek-V4-Flash" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(useArchStore.getState().appMode).toBe("model");
  });

  it("marks the chip active when its model is loaded in the dashboard", () => {
    useArchStore.setState({ spec: flashSpec, appMode: "model" });
    render(<QuickModels onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "DeepSeek-V4-Flash" })).toHaveAttribute("aria-current", "page");
  });

  it("disables every chip while a model is loading", () => {
    useArchStore.setState({ loading: true });
    render(<QuickModels onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "DeepSeek-V4-Flash" })).toBeDisabled();
  });
});
