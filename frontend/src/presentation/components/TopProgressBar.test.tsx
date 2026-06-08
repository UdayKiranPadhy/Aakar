import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TopProgressBar } from "./TopProgressBar";

describe("TopProgressBar", () => {
  it("renders an indeterminate progressbar (carries no value)", () => {
    render(<TopProgressBar />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeInTheDocument();
    expect(bar).not.toHaveAttribute("aria-valuenow");
  });
});
