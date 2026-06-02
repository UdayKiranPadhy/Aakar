import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NavBar } from "./NavBar";
import { useArchStore } from "../../store/archStore";

// QuickModels' chips come from trending (a fetch); stub it deterministically.
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

describe("NavBar", () => {
  it("renders the brand and the search input", () => {
    render(<NavBar onSubmit={() => {}} />);
    expect(screen.getByRole("link", { name: /Aakar/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders the section tabs and quick-model chips once a model is loaded", () => {
    useArchStore.setState({ appMode: "model" });
    render(<NavBar onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "Model" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "gpt2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mistral-7B-v0.1" })).toBeInTheDocument();
  });

  it("hides the tab row on the home view (only the top search bar shows)", () => {
    useArchStore.setState({ appMode: "home" });
    render(<NavBar onSubmit={() => {}} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Model" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "gpt2" })).not.toBeInTheDocument();
  });

  it("overlays the page on the home view and is visible by default", () => {
    useArchStore.setState({ appMode: "home" });
    const { container } = render(<NavBar onSubmit={() => {}} />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("wrapperOverlay");
    expect(wrapper?.className).not.toContain("wrapperHidden");
  });

  it("slides up (hidden) when hidden=true", () => {
    useArchStore.setState({ appMode: "home" });
    const { container } = render(<NavBar onSubmit={() => {}} hidden />);
    expect(container.firstElementChild?.className).toContain("wrapperHidden");
  });

  it("does not overlay in the model dashboard", () => {
    useArchStore.setState({ appMode: "model" });
    const { container } = render(<NavBar onSubmit={() => {}} />);
    expect(container.firstElementChild?.className).not.toContain("wrapperOverlay");
  });

  it("clicking the brand link routes back to home (preserves loaded spec)", async () => {
    useArchStore.setState({ appMode: "model" });
    render(<NavBar onSubmit={() => {}} />);
    await userEvent.click(screen.getByRole("link", { name: /Aakar/ }));
    expect(useArchStore.getState().appMode).toBe("home");
  });
});
