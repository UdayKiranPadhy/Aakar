import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ModelInputBar } from "./ModelInputBar";
import { useArchStore } from "../../store/archStore";

describe("ModelInputBar", () => {
  it("displays the placeholder copy when empty", () => {
    render(<ModelInputBar onSubmit={() => {}} />);
    expect(
      screen.getByPlaceholderText(/Search a HuggingFace model/),
    ).toBeInTheDocument();
  });

  it("submits the trimmed value on Enter", async () => {
    const onSubmit = vi.fn();
    render(<ModelInputBar onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "  gpt2  {Enter}");
    expect(onSubmit).toHaveBeenCalledWith("gpt2");
  });

  it("does not submit on empty / whitespace-only input", async () => {
    const onSubmit = vi.fn();
    render(<ModelInputBar onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "   {Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the input while loading", () => {
    useArchStore.setState({ loading: true });
    render(<ModelInputBar onSubmit={() => {}} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("renders the error message below the pill when one is set", () => {
    useArchStore.setState({ error: "Model not found: gpt-99" });
    render(<ModelInputBar onSubmit={() => {}} />);
    expect(
      screen.getByRole("alert").textContent,
    ).toContain("Model not found: gpt-99");
  });

  it("two-way binds the input to store.modelInput", async () => {
    render(<ModelInputBar onSubmit={() => {}} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "Qwen/Qwen3-0.6B");
    expect(useArchStore.getState().modelInput).toBe("Qwen/Qwen3-0.6B");
  });
});
