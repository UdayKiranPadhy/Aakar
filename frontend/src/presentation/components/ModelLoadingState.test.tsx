import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModelLoadingState } from "./ModelLoadingState";

describe("ModelLoadingState", () => {
  it("renders a polite status with the illustration", () => {
    const { container } = render(<ModelLoadingState />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/building the architecture/i)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("shows the requested model id when provided", () => {
    render(<ModelLoadingState modelId="meta-llama/Llama-3-8B" />);
    expect(screen.getByText("meta-llama/Llama-3-8B")).toBeInTheDocument();
  });

  it("omits the model pill when no id is given", () => {
    render(<ModelLoadingState />);
    expect(screen.queryByText(/^loading$/i)).not.toBeInTheDocument();
  });
});
