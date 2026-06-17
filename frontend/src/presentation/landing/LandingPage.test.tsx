import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LandingPage } from "./LandingPage";

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
    expect(headings).toContain("Find What's inside your model");
    expect(headings).toContain("Zoom in, see the Math");
    expect(headings).toContain("Is Attention all you need?");
    expect(headings).toContain("Journey of a token");
    expect(headings).toContain("Any HuggingFace architecture, automatically");
  });

  it("loads a model when an example chip is clicked", () => {
    const onSubmit = vi.fn();
    render(<LandingPage onSubmit={onSubmit} />);
    // Appears in both the hero and the CTA chip rows; the first is enough.
    fireEvent.click(screen.getAllByRole("button", { name: "openai/gpt-oss-20b" })[0]);
    expect(onSubmit).toHaveBeenCalledWith("openai/gpt-oss-20b");
  });
});
