import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ModelSearchRepository } from "../../application/interfaces";
import type { ModelSummary } from "../../domain/modelSearch";
import { ModelInputBar } from "./ModelInputBar";
import { useArchStore } from "../../store/archStore";

/** A repo returning no suggestions — keeps the autocomplete offline + quiet for
 *  tests that aren't about the dropdown. */
const silentRepo: ModelSearchRepository = { async search() { return []; } };

/** A repo returning fixed suggestions for the dropdown tests. */
function repoWith(results: ReadonlyArray<ModelSummary>): ModelSearchRepository {
  return { async search() { return results; } };
}

describe("ModelInputBar", () => {
  it("displays the placeholder copy when empty", () => {
    render(<ModelInputBar onSubmit={() => {}} searchRepo={silentRepo} />);
    expect(screen.getByPlaceholderText(/Search a HuggingFace model/)).toBeInTheDocument();
  });

  it("submits the trimmed value on Enter", async () => {
    const onSubmit = vi.fn();
    render(<ModelInputBar onSubmit={onSubmit} searchRepo={silentRepo} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "  gpt2  {Enter}");
    expect(onSubmit).toHaveBeenCalledWith("gpt2");
  });

  it("does not submit on empty / whitespace-only input", async () => {
    const onSubmit = vi.fn();
    render(<ModelInputBar onSubmit={onSubmit} searchRepo={silentRepo} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "   {Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the input while loading", () => {
    useArchStore.setState({ loading: true });
    render(<ModelInputBar onSubmit={() => {}} searchRepo={silentRepo} />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("two-way binds the input to store.modelInput", async () => {
    render(<ModelInputBar onSubmit={() => {}} searchRepo={silentRepo} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Qwen/Qwen3-0.6B");
    expect(useArchStore.getState().modelInput).toBe("Qwen/Qwen3-0.6B");
  });

  it("shows Hub suggestions while typing and submits the clicked one", async () => {
    const onSubmit = vi.fn();
    const repo = repoWith([
      { id: "openai-community/gpt2", downloads: 10154763, likes: 5, pipelineTag: "text-generation" },
    ]);
    render(<ModelInputBar onSubmit={onSubmit} searchRepo={repo} />);

    await userEvent.type(screen.getByRole("combobox"), "gpt2");
    const option = await screen.findByRole("option", { name: /openai-community\/gpt2/ });
    await userEvent.click(option);

    expect(onSubmit).toHaveBeenCalledWith("openai-community/gpt2");
    expect(useArchStore.getState().modelInput).toBe("openai-community/gpt2");
  });

  it("picks a suggestion via arrow keys + Enter", async () => {
    const onSubmit = vi.fn();
    const repo = repoWith([
      { id: "openai-community/gpt2", downloads: 100, likes: 1, pipelineTag: null },
      { id: "openai-community/gpt2-large", downloads: 50, likes: 1, pipelineTag: null },
    ]);
    render(<ModelInputBar onSubmit={onSubmit} searchRepo={repo} />);

    await userEvent.type(screen.getByRole("combobox"), "gpt2");
    await screen.findByRole("option", { name: /gpt2-large/ });
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("openai-community/gpt2-large");
  });

  it("closes the dropdown on Escape without submitting", async () => {
    const onSubmit = vi.fn();
    const repo = repoWith([
      { id: "openai-community/gpt2", downloads: 100, likes: 1, pipelineTag: null },
    ]);
    render(<ModelInputBar onSubmit={onSubmit} searchRepo={repo} />);

    await userEvent.type(screen.getByRole("combobox"), "gpt2");
    await screen.findByRole("option", { name: /openai-community\/gpt2/ });
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
