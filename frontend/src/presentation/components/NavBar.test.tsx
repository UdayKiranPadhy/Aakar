import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { NavBar } from "./NavBar";
import { useArchStore } from "../../store/archStore";

describe("NavBar", () => {
  it("renders the brand, search input, GitHub + Help links, and version", () => {
    render(<NavBar onSubmit={() => {}} />);
    expect(screen.getByRole("link", { name: /Aakar/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Help" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
    expect(screen.getByText("v0.1")).toBeInTheDocument();
  });

  it("renders the section tabs and quick-model chips", () => {
    render(<NavBar onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GPT-2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mistral-7B" })).toBeInTheDocument();
  });

  it("uses the full-height wrapper class by default (collapsed=false)", () => {
    const { container } = render(<NavBar onSubmit={() => {}} />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).not.toContain("wrapperCollapsed");
  });

  it("toggles to wrapperCollapsed when collapsed=true", () => {
    const { container } = render(
      <NavBar onSubmit={() => {}} collapsed={true} />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("wrapperCollapsed");
    const header = container.querySelector("header");
    expect(header?.className).toContain("headerCollapsed");
  });

  it("clicking the brand link routes back to home (preserves loaded spec)", async () => {
    useArchStore.setState({ view: "visualizer" });
    render(<NavBar onSubmit={() => {}} />);
    await userEvent.click(screen.getByRole("link", { name: /Aakar/ }));
    expect(useArchStore.getState().view).toBe("home");
  });
});
