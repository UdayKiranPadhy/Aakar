import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErrorState } from "./ErrorState";
import type { LoadError } from "../../application/loadError";

const unsupported: LoadError = {
  kind: "unsupported",
  title: "Unsupported architecture",
  detail: "Model 'nvidia/LocateAnything-3B' uses an architecture (unknown) that Aakar can't load.",
  hint: "This model ships custom modeling code (it needs trust_remote_code).",
  modelId: "nvidia/LocateAnything-3B",
  architecture: null,
  status: 422,
};

describe("ErrorState", () => {
  it("shows the title, detailed message, and hint", () => {
    render(<ErrorState error={unsupported} />);
    expect(screen.getByText("Unsupported architecture")).toBeInTheDocument();
    expect(screen.getByText(/Aakar can't load/)).toBeInTheDocument();
    expect(screen.getByText(/trust_remote_code/)).toBeInTheDocument();
  });

  it("renders facts for model id and status (and skips null architecture)", () => {
    render(<ErrorState error={unsupported} />);
    expect(screen.getByText("nvidia/LocateAnything-3B")).toBeInTheDocument();
    expect(screen.getByText("422")).toBeInTheDocument();
    expect(screen.queryByText("architecture")).not.toBeInTheDocument();
  });

  it("includes an illustration and an alert role", () => {
    const { container } = render(<ErrorState error={unsupported} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("shows the architecture fact when present", () => {
    render(
      <ErrorState
        error={{ ...unsupported, architecture: "DeepSeekV3" }}
      />,
    );
    expect(screen.getByText("DeepSeekV3")).toBeInTheDocument();
  });
});
