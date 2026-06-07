import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

/** Throws on render to simulate an unexpected object reaching React. */
function Boom(): never {
  throw new Error("Objects are not valid as a React child");
}

describe("ErrorBoundary", () => {
  // React (and our componentDidCatch) log every caught error; silence to keep
  // the test output clean. Restored after each test.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>healthy content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("healthy content")).toBeInTheDocument();
  });

  it("renders the fallback instead of letting a render error propagate", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    // The default fallback reuses ErrorState (alert role + headline) rather
    // than crashing the whole tree to a blank screen.
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    // The thrown message is surfaced for debugging.
    expect(
      screen.getByText(/Objects are not valid as a React child/),
    ).toBeInTheDocument();
  });

  it("renders a custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={(error) => <div role="alert">custom: {error.message}</div>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/custom: Objects are not valid/)).toBeInTheDocument();
  });

  it("recovers via the reset callback once the child stops throwing", async () => {
    let crash = true;
    function Maybe() {
      if (crash) throw new Error("boom");
      return <p>recovered content</p>;
    }
    const user = userEvent.setup();
    render(
      <ErrorBoundary
        fallback={(_error, reset) => (
          <button
            onClick={() => {
              crash = false;
              reset();
            }}
          >
            retry
          </button>
        )}
      >
        <Maybe />
      </ErrorBoundary>,
    );

    await user.click(screen.getByText("retry"));
    expect(screen.getByText("recovered content")).toBeInTheDocument();
  });
});
