import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ModelSearchRepository } from "../../application/interfaces";
import { ModelInputBar } from "./ModelInputBar";
import { useArchStore } from "../../store/archStore";

/** A repo returning no suggestions — keeps the autocomplete quiet for tests that
 *  aren't about the dropdown. */
const silentRepo: ModelSearchRepository = { async search() { return []; } };

/** A repo returning fixed id suggestions for the dropdown tests. */
function repoWith(results: ReadonlyArray<string>): ModelSearchRepository {
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

  it("clears the input and refocuses it via the X button", async () => {
    render(<ModelInputBar onSubmit={() => {}} searchRepo={silentRepo} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "gpt2");
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(useArchStore.getState().modelInput).toBe("");
    expect(input).toHaveFocus();
  });

  it("shows no clear button when the field is empty", () => {
    render(<ModelInputBar onSubmit={() => {}} searchRepo={silentRepo} />);
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("offers featured suggestions when focused while empty and submits the clicked one", async () => {
    const onSubmit = vi.fn();
    render(
      <ModelInputBar
        onSubmit={onSubmit}
        searchRepo={silentRepo}
        featured={["meta-llama/Llama-3-8B", "google/gemma-2-9b"]}
      />,
    );

    // No typing — focusing the empty field is enough to reveal the featured ids.
    await userEvent.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "meta-llama/Llama-3-8B" });
    await userEvent.click(option);

    expect(onSubmit).toHaveBeenCalledWith("meta-llama/Llama-3-8B");
    expect(useArchStore.getState().modelInput).toBe("meta-llama/Llama-3-8B");
  });

  it("hides featured suggestions once a real query is typed", async () => {
    render(
      <ModelInputBar
        onSubmit={() => {}}
        searchRepo={repoWith(["openai-community/gpt2"])}
        featured={["meta-llama/Llama-3-8B"]}
      />,
    );

    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await screen.findByRole("option", { name: "meta-llama/Llama-3-8B" });

    await userEvent.type(input, "gpt2");
    await screen.findByRole("option", { name: "openai-community/gpt2" });
    expect(screen.queryByRole("option", { name: "meta-llama/Llama-3-8B" })).not.toBeInTheDocument();
  });

  it("shows id suggestions while typing and submits the clicked one", async () => {
    const onSubmit = vi.fn();
    render(<ModelInputBar onSubmit={onSubmit} searchRepo={repoWith(["openai-community/gpt2"])} />);

    await userEvent.type(screen.getByRole("combobox"), "gpt2");
    const option = await screen.findByRole("option", { name: "openai-community/gpt2" });
    await userEvent.click(option);

    expect(onSubmit).toHaveBeenCalledWith("openai-community/gpt2");
    expect(useArchStore.getState().modelInput).toBe("openai-community/gpt2");
  });

  it("picks a suggestion via arrow keys + Enter", async () => {
    const onSubmit = vi.fn();
    const repo = repoWith(["openai-community/gpt2", "openai-community/gpt2-large"]);
    render(<ModelInputBar onSubmit={onSubmit} searchRepo={repo} />);

    await userEvent.type(screen.getByRole("combobox"), "gpt2");
    await screen.findByRole("option", { name: "openai-community/gpt2-large" });
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("openai-community/gpt2-large");
  });

  it("closes the dropdown on Escape without submitting", async () => {
    const onSubmit = vi.fn();
    render(<ModelInputBar onSubmit={onSubmit} searchRepo={repoWith(["openai-community/gpt2"])} />);

    await userEvent.type(screen.getByRole("combobox"), "gpt2");
    await screen.findByRole("option", { name: "openai-community/gpt2" });
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
