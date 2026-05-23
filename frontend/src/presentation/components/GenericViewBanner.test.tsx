import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GenericViewBanner } from "./GenericViewBanner";
import { useArchStore } from "../../store/archStore";
import type { Spec } from "../../domain/spec";

function specWithNotes(notes?: string[]): Spec {
  return {
    model_id: "test",
    model_type: "test",
    config_summary: {},
    graph: [],
    notes,
  };
}

describe("GenericViewBanner", () => {
  it("renders nothing when there are no notes", () => {
    useArchStore.setState({ spec: specWithNotes() });
    const { container } = render(<GenericViewBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when notes is an empty array", () => {
    useArchStore.setState({ spec: specWithNotes([]) });
    const { container } = render(<GenericViewBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one row per note", () => {
    const notes = [
      "Generic rendering — model_type 'gpt99' is not specifically supported.",
      "Some architectural details may not be shown accurately.",
    ];
    useArchStore.setState({ spec: specWithNotes(notes) });
    const { container, getByText } = render(<GenericViewBanner />);
    for (const n of notes) {
      expect(getByText(n)).toBeInTheDocument();
    }
    // The wrapper exists when there's at least one note.
    expect(container.firstChild).not.toBeNull();
  });
});
