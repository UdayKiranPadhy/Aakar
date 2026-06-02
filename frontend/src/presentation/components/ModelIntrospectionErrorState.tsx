/**
 * Rich page for the two introspection-stage failures, which share one
 * illustration (a figure facing a module graph with a warning) and differ
 * only in copy:
 *  - timeout (HTTP 504, IntrospectionTimeout): the module tree took too long to build.
 *  - failed  (HTTP 502, IntrospectionFailed):  Aakar reached the model but the build threw.
 * Mirrors the other rich error pages and reuses their stylesheet; the artwork
 * is a flat illustration asset.
 */

import type { LoadError } from "../../application/loadError";
import illustrationUrl from "./model-introspection-error.svg";
import styles from "./ModelNotFoundState.module.css";

export function ModelIntrospectionErrorState({ error }: { error: LoadError }) {
  const isTimeout = error.kind === "timeout";
  return (
    <div className={styles.root} role="alert" aria-live="polite">
      <div className={styles.copy}>
        <div className={styles.badge}>{isTimeout ? <ClockBadge /> : <AlertBadge />}</div>

        <h1 className={styles.title}>
          {isTimeout ? "Introspection timed out" : "Introspection failed"}
        </h1>
        <p className={styles.subtitle}>
          {isTimeout
            ? "Building this model’s module tree took longer than Aakar’s time budget. Unusually large or deeply-nested models can run past it."
            : "Aakar reached the model on the Hub but couldn’t build its module tree. Its modeling code may clash with the transformers version Aakar pins, or need packages it doesn’t ship."}
        </p>

        {error.modelId && (
          <div className={styles.requested}>
            <span className={styles.requestedLabel}>model</span>
            <code className={styles.requestedId}>{error.modelId}</code>
          </div>
        )}

        <hr className={styles.divider} />

        <p className={styles.tryLabel}>What you can try:</p>
        <ul className={styles.tips}>
          {isTimeout ? (
            <>
              <li className={styles.tip}>
                <span className={styles.tipIcon} data-tone="blue"><RefreshIcon /></span>
                Try again &mdash; a slow first build often clears on a retry
              </li>
              <li className={styles.tip}>
                <span className={styles.tipIcon} data-tone="yellow"><LayersIcon /></span>
                Very large or deeply-nested models can exceed the time budget
              </li>
              <li className={styles.tip}>
                <span className={styles.tipIcon} data-tone="green"><BlocksIcon /></span>
                A smaller or more common model loads faster
              </li>
            </>
          ) : (
            <>
              <li className={styles.tip}>
                <span className={styles.tipIcon} data-tone="blue"><RefreshIcon /></span>
                Try again &mdash; the failure may be transient
              </li>
              <li className={styles.tip}>
                <span className={styles.tipIcon} data-tone="yellow"><CodeIcon /></span>
                Custom modeling code can clash with the pinned transformers
              </li>
              <li className={styles.tip}>
                <span className={styles.tipIcon} data-tone="green"><BlocksIcon /></span>
                Models on stock architectures (Llama, Qwen, GPT-2&hellip;) build reliably
              </li>
            </>
          )}
        </ul>
      </div>

      <div className={styles.art}>
        <img src={illustrationUrl} alt="" aria-hidden="true" className={styles.artImg} />
      </div>
    </div>
  );
}

/* Soft-blue badge: a clock — the timeout cue. */
function ClockBadge() {
  return (
    <svg viewBox="0 0 96 96" width="84" height="84" fill="none" role="img" aria-hidden="true">
      <circle cx="48" cy="48" r="48" fill="#E8F0FE" />
      <circle cx="48" cy="48" r="26" fill="#fff" stroke="#1A73E8" strokeWidth="5" />
      <path d="M48 32 V48 L60 56" stroke="#1A73E8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Soft-red badge: a warning triangle — echoes the illustration's alert. */
function AlertBadge() {
  return (
    <svg viewBox="0 0 96 96" width="84" height="84" fill="none" role="img" aria-hidden="true">
      <circle cx="48" cy="48" r="48" fill="#FCE8E6" />
      <path d="M48 28 L70 66 H26 Z" fill="#EA4335" stroke="#C5221F" strokeWidth="3" strokeLinejoin="round" />
      <rect x="45.5" y="42" width="5" height="13" rx="2.5" fill="#fff" />
      <circle cx="48" cy="60" r="2.8" fill="#fff" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11 a8 8 0 1 0 -2 5.5" />
      <path d="M20 5 V11 H14" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L21 8 L12 13 L3 8 Z" />
      <path d="M3 12 L12 17 L21 12" />
      <path d="M3 16 L12 21 L21 16" />
    </svg>
  );
}
function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 8 L5 12 L9 16" />
      <path d="M15 8 L19 12 L15 16" />
    </svg>
  );
}
function BlocksIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
      <path d="M13 7 H21 M7 13 V21" />
    </svg>
  );
}
