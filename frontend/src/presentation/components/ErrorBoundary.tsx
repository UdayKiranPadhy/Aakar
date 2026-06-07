/**
 * App-level React error boundary.
 *
 * Without one, any error thrown during render — e.g. rendering an unexpected
 * object from the open-ended HuggingFace config as a React child — unmounts the
 * whole tree and leaves a blank white screen. This boundary catches that, keeps
 * the surrounding chrome (nav, sidebar) alive, and degrades to the same
 * `ErrorState` page the load failures use, in line with the repo's
 * "render whatever the API returns, never crash" philosophy.
 *
 * Reset is by remount: give it a `key` tied to the loaded model/view so loading
 * a different model or switching views clears a caught error automatically. A
 * `reset()` callback is also handed to custom fallbacks for in-place retries.
 *
 * This is a class because React only supports error boundaries via the
 * `getDerivedStateFromError` / `componentDidCatch` lifecycle — there is no hook
 * equivalent.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

import type { LoadError } from "../../application/loadError";
import { ErrorState } from "./ErrorState";

type FallbackRender = (error: Error, reset: () => void) => ReactNode;

type Props = {
  children: ReactNode;
  /**
   * Override the default full-area `ErrorState`. Lets a narrower boundary (e.g.
   * around a single block renderer) show a compact inline fallback instead.
   */
  fallback?: FallbackRender;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface the stack so a render crash stays debuggable even though the UI
    // recovers gracefully rather than unmounting.
    console.error("ErrorBoundary caught a render error:", error, info.componentStack);
  }

  private reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultErrorFallback error={error} />;
  }
}

/**
 * Default fallback: reuse `ErrorState` (illustration, alert role, styling) by
 * shaping the caught error into a generic `LoadError`. The raw message rides in
 * the hint so it stays visible for debugging without dominating the page.
 */
function DefaultErrorFallback({ error }: { error: Error }) {
  const loadError: LoadError = {
    kind: "unknown",
    title: "Something went wrong",
    detail:
      "Aakar ran into unexpected data while rendering this view and couldn't " +
      "display it. The rest of the app is still working — switch views or try " +
      "another model to continue.",
    hint: error.message ? `Technical detail: ${error.message}` : undefined,
  };
  return <ErrorState error={loadError} />;
}
