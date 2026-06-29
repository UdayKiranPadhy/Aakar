/**
 * "Something went wrong" page for unexpected server errors (HTTP 5xx that
 * aren't one of the specific introspection failures). The provided artwork is a
 * complete page mockup, so it's shown full-bleed; the visually-hidden text
 * carries the real message for screen readers.
 */

import type { LoadError } from "../../application/loadError";
import { RetryButton } from "./RetryButton";
import illustrationUrl from "./server-error.svg";
import styles from "./ModelServerErrorState.module.css";

export function ModelServerErrorState({
  error,
  onRetry,
}: {
  error: LoadError;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.root} role="alert" aria-live="polite">
      <p className={styles.srOnly}>
        {error.title}. {error.detail}
        {error.modelId ? ` (model: ${error.modelId})` : ""}
      </p>
      <img
        src={illustrationUrl}
        alt="Something went wrong — Aakar hit an unexpected error while building this model's graph. Please try again in a few moments."
        className={styles.image}
      />
      {onRetry && (
        <div className={styles.retryOverlay}>
          <RetryButton onRetry={onRetry} />
        </div>
      )}
    </div>
  );
}
