import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { NavBar } from "./NavBar";
import { useArchStore } from "../../store/archStore";

describe("NavBar", () => {
  it("renders the brand", () => {
    render(<NavBar />);
    expect(screen.getByRole("link", { name: /Aakar/ })).toBeInTheDocument();
  });

  it("renders the section tabs once a model is loaded", () => {
    useArchStore.setState({ appMode: "model" });
    render(<NavBar />);
    expect(screen.getByRole("button", { name: "Model" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learn" })).toBeInTheDocument();
  });

  it("hides the tab row on the home view (only the brand shows)", () => {
    useArchStore.setState({ appMode: "home" });
    render(<NavBar />);
    expect(screen.getByRole("link", { name: /Aakar/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Model" })).not.toBeInTheDocument();
  });

  it("overlays the page on the home view and is visible by default", () => {
    useArchStore.setState({ appMode: "home" });
    const { container } = render(<NavBar />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("wrapperOverlay");
    expect(wrapper?.className).not.toContain("wrapperHidden");
  });

  it("slides up (hidden) when hidden=true", () => {
    useArchStore.setState({ appMode: "home" });
    const { container } = render(<NavBar hidden />);
    expect(container.firstElementChild?.className).toContain("wrapperHidden");
  });

  it("does not overlay in the model dashboard", () => {
    useArchStore.setState({ appMode: "model" });
    const { container } = render(<NavBar />);
    expect(container.firstElementChild?.className).not.toContain("wrapperOverlay");
  });

  it("shows the loading progress bar while a model is loading", () => {
    useArchStore.setState({ appMode: "model", loading: true });
    const { unmount } = render(<NavBar />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    unmount(); // reset after unmount so the shared store isn't updated mid-mount
    useArchStore.setState({ loading: false });
  });

  it("hides the progress bar when not loading", () => {
    useArchStore.setState({ appMode: "model", loading: false });
    render(<NavBar />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("clicking the brand link routes back to home (preserves loaded spec)", async () => {
    useArchStore.setState({ appMode: "model" });
    render(<NavBar />);
    await userEvent.click(screen.getByRole("link", { name: /Aakar/ }));
    expect(useArchStore.getState().appMode).toBe("home");
  });
});
