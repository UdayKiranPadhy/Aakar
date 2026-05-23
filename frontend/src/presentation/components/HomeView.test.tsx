import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeView } from "./HomeView";

describe("HomeView", () => {
  it("renders the product title", () => {
    render(<HomeView />);
    expect(screen.getByRole("heading", { name: "Aakar" })).toBeInTheDocument();
  });

  it("includes the eyebrow tag", () => {
    render(<HomeView />);
    expect(screen.getByText(/LLM architecture visualizer/i)).toBeInTheDocument();
  });

  it("shows the architecture preview stages", () => {
    render(<HomeView />);
    expect(screen.getByText("Tokens")).toBeInTheDocument();
    expect(screen.getByText("Decoder layers")).toBeInTheDocument();
    expect(screen.getByText("Logits")).toBeInTheDocument();
  });

  it("renders architecture lens sections", () => {
    render(<HomeView />);
    const sections = screen.getAllByRole("heading", { level: 2 });
    expect(sections.map((section) => section.textContent)).toEqual([
      "Decoder paths stay readable",
      "Q/K/V is shown as a fan-in",
      "Parameters have visual weight",
    ]);
  });
});
