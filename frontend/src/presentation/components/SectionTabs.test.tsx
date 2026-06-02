import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SectionTabs } from "./SectionTabs";
import { useArchStore } from "../../store/archStore";

describe("SectionTabs", () => {
  it("renders the app-level tabs", () => {
    render(<SectionTabs />);
    for (const label of ["Model", "Compare", "Learn"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the tab matching the current appMode as active", () => {
    useArchStore.setState({ appMode: "model" });
    render(<SectionTabs />);
    expect(screen.getByRole("button", { name: "Model" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Compare" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("clicking a tab sets the corresponding appMode", async () => {
    useArchStore.setState({ appMode: "model" });
    render(<SectionTabs />);
    await userEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(useArchStore.getState().appMode).toBe("compare");
  });
});
