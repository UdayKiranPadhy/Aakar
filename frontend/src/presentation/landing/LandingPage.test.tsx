import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LandingPage } from "./LandingPage";

// Example chips come from trending (a fetch); stub it so a known "gpt2" chip
// is present for the click assertion below.
vi.mock("../../application/useTrendingModels", () => ({
  useTrendingModels: () => ({
    models: [
      { model_id: "gpt2", tags: [] },
      { model_id: "mistralai/Mistral-7B-v0.1", tags: [] },
    ],
    loading: false,
    error: false,
  }),
}));

// IntersectionObserver / matchMedia / getTotalLength are stubbed globally in
// tests/setup.ts so framer-motion runs under jsdom. whileInView never fires, so
// scroll-revealed content stays at its initial style — but it's in the DOM,
// which is all these structural assertions need.

describe("LandingPage", () => {
  it("renders the hero headline as the h1", () => {
    render(<LandingPage onSubmit={() => {}} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "See inside any model" }),
    ).toBeInTheDocument();
  });

  it("renders the feature section headings", () => {
    render(<LandingPage onSubmit={() => {}} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toContain("From a model id to its real module tree");
    expect(headings).toContain("Q, K, V come together as a fan-in");
    expect(headings).toContain("Parameters have visual weight");
    expect(headings).toContain("Any HuggingFace architecture, automatically");
  });

  it("loads a model when an example chip is clicked", () => {
    const onSubmit = vi.fn();
    render(<LandingPage onSubmit={onSubmit} />);
    // gpt2 appears in both the hero and the CTA chip rows; the first is enough.
    fireEvent.click(screen.getAllByRole("button", { name: "gpt2" })[0]);
    expect(onSubmit).toHaveBeenCalledWith("gpt2");
  });
});
