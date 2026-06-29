import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HelpOverlay } from "./HelpOverlay";
import { useArchStore } from "../../store/archStore";

afterEach(() => useArchStore.setState({ helpOpen: false }));

describe("HelpOverlay", () => {
  it("renders nothing while closed", () => {
    useArchStore.setState({ helpOpen: false });
    render(<HelpOverlay />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders a modal dialog and focuses the close button when open", () => {
    useArchStore.setState({ helpOpen: true });
    render(<HelpOverlay />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /close help/i }));
  });

  it("closes on Escape and on a backdrop click", () => {
    useArchStore.setState({ helpOpen: true });
    const { rerender } = render(<HelpOverlay />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(useArchStore.getState().helpOpen).toBe(false);

    useArchStore.setState({ helpOpen: true });
    rerender(<HelpOverlay />);
    // The backdrop is the dialog's parent element.
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(useArchStore.getState().helpOpen).toBe(false);
  });
});
