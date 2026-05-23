import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeView } from "./HomeView";

describe("HomeView", () => {
  it("renders the welcome hero", () => {
    render(<HomeView />);
    expect(
      screen.getByRole("heading", { name: "Welcome to Aakar" }),
    ).toBeInTheDocument();
  });

  it("includes the eyebrow tag", () => {
    render(<HomeView />);
    expect(screen.getByText(/v0\.1 · llama family/i)).toBeInTheDocument();
  });

  it("describes how to use the tool in the lead paragraph", () => {
    render(<HomeView />);
    expect(
      screen.getByText(/interactive visualizer for large-language-model architectures/),
    ).toBeInTheDocument();
  });

  it("renders multiple section headings (the lorem-ipsum sections that make the page scroll)", () => {
    render(<HomeView />);
    // h2 headings — at least 4 sections are present
    const sections = screen.getAllByRole("heading", { level: 2 });
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });
});
