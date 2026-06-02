import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModelGatedState } from "./ModelGatedState";
import type { LoadError } from "../../application/loadError";

const error: LoadError = {
  kind: "gated",
  title: "Gated or private model",
  detail: "Model is gated or private: 'meta-llama/Llama-3-8B'",
  modelId: "meta-llama/Llama-3-8B",
  status: 403,
};

describe("ModelGatedState", () => {
  it("shows the heading, the model chip, and the illustration", () => {
    const { container } = render(<ModelGatedState error={error} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /gated or private model/i })).toBeInTheDocument();
    expect(screen.getByText("meta-llama/Llama-3-8B")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeInTheDocument();
  });
});
