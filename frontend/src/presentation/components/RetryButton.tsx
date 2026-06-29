/**
 * Shared "Try again" button for the error pages. Thin wrapper over the UI Button
 * with a refresh glyph; the retry behavior is supplied by the caller (wired to
 * `loadModel` via `useRetryLoad`).
 */

import { Button } from "./ui/Button";

export function RetryButton({
  onRetry,
  label = "Try again",
}: {
  onRetry: () => void;
  label?: string;
}) {
  return (
    <Button variant="secondary" size="md" onClick={onRetry}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <RefreshIcon />
        {label}
      </span>
    </Button>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11 a8 8 0 1 0 -2 5.5" />
      <path d="M20 5 V11 H14" />
    </svg>
  );
}
