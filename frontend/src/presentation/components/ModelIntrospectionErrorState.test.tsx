import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModelIntrospectionErrorState } from "./ModelIntrospectionErrorState";
import type { LoadError } from "../../application/loadError";

const timeout: LoadError = {
  kind: "timeout",
  title: "Introspection timed out",
  detail: "Introspection timed out for 'huge-org/Huge-Model'",
  modelId: "huge-org/Huge-Model",
  status: 504,
};

const failed: LoadError = {
  kind: "failed",
  title: "Introspection failed",
  detail: "Introspection failed for 'some-org/Quirky-Model'",
  modelId: "some-org/Quirky-Model",
  status: 502,
};

describe("ModelIntrospectionErrorState", () => {
  it("renders the timeout heading, model chip, and illustration", () => {
    const { container } = render(<ModelIntrospectionErrorState error={timeout} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /introspection timed out/i })).toBeInTheDocument();
    expect(screen.getByText("huge-org/Huge-Model")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("renders the failed heading and model chip", () => {
    render(<ModelIntrospectionErrorState error={failed} />);
    expect(screen.getByRole("heading", { name: /introspection failed/i })).toBeInTheDocument();
    expect(screen.getByText("some-org/Quirky-Model")).toBeInTheDocument();
  });
});
