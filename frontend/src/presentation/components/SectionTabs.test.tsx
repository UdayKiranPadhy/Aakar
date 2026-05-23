import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SectionTabs } from "./SectionTabs";
import { useArchStore } from "../../store/archStore";

describe("SectionTabs", () => {
  it("renders the Home tab", () => {
    render(<SectionTabs />);
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
  });

  it("marks Home as the active tab when view === 'home'", () => {
    useArchStore.setState({ view: "home" });
    render(<SectionTabs />);
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("removes the active marker when view === 'visualizer'", () => {
    useArchStore.setState({ view: "visualizer" });
    render(<SectionTabs />);
    expect(screen.getByRole("button", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("clicking Home sets view to 'home'", async () => {
    useArchStore.setState({ view: "visualizer" });
    render(<SectionTabs />);
    await userEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(useArchStore.getState().view).toBe("home");
  });
});
