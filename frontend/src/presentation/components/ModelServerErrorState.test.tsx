import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModelServerErrorState } from "./ModelServerErrorState";
import type { LoadError } from "../../application/loadError";

const error: LoadError = {
  kind: "server_error",
  title: "Something went wrong",
  detail: "Aakar hit an unexpected error while building this model's graph.",
  modelId: "org/model",
  status: 500,
};

describe("ModelServerErrorState", () => {
  it("renders the illustration with an alert role", () => {
    const { container } = render(<ModelServerErrorState error={error} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("exposes the real message + model id to screen readers", () => {
    render(<ModelServerErrorState error={error} />);
    expect(
      screen.getByText(/unexpected error while building/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/org\/model/)).toBeInTheDocument();
  });
});
