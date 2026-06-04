/**
 * Rich "Architecture not supported" page — used for the unsupported error kind
 * (a model whose architecture Aakar can't load: needs trust_remote_code, or is
 * newer than the pinned transformers). Mirrors the ModelNotFoundState layout
 * and reuses its stylesheet; the artwork is a flat illustration asset.
 */

import type { LoadError } from "../../application/loadError";
import illustrationUrl from "./architecture-unsupported.svg";
import styles from "./ModelNotFoundState.module.css";

export function ModelUnsupportedState({ error }: { error: LoadError }) {
  return (
    <div className={styles.root} role="alert" aria-live="polite">
      <div className={styles.copy}>
        <div className={styles.badge}>
          <BadgeMark />
        </div>

        <h1 className={styles.title}>Architecture not supported</h1>
        <p className={styles.subtitle}>
          Aakar couldn&rsquo;t load this model&rsquo;s architecture. It either ships custom
          modeling code (it needs trust_remote_code) or is newer than the transformers
          version Aakar pins.
        </p>

        <div className={styles.factsRow}>
          {error.modelId && (
            <span className={styles.requested}>
              <span className={styles.requestedLabel}>model</span>
              <code className={styles.requestedId}>{error.modelId}</code>
            </span>
          )}
          {error.architecture && (
            <span className={styles.requested}>
              <span className={styles.requestedLabel}>architecture</span>
              <code className={styles.requestedId}>{error.architecture}</code>
            </span>
          )}
        </div>

        <hr className={styles.divider} />

        <p className={styles.tryLabel}>What you can try:</p>
        <ul className={styles.tips}>
          <li className={styles.tip}>
            <span className={styles.tipIcon} data-tone="blue"><BlocksIcon /></span>
            Try a model on a stock architecture (Llama, Qwen, Mistral, GPT-2…)
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} data-tone="yellow"><ShieldIcon /></span>
            Custom-code models (trust_remote_code) aren&rsquo;t run, for safety
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} data-tone="green"><RefreshIcon /></span>
            Brand-new architecture? The current pinned transformers (5.9.0) may need a bump
          </li>
        </ul>
      </div>

      <div className={styles.art}>
        <img src={illustrationUrl} alt="" aria-hidden="true" className={styles.artImg} />
      </div>
    </div>
  );
}

/* Soft-amber badge: a puzzle piece that won't slot in. */
function BadgeMark() {
  return (
    <svg viewBox="0 0 96 96" width="84" height="84" fill="none" role="img" aria-hidden="true">
      <circle cx="48" cy="48" r="48" fill="#FEF7E0" />
      <path
        d="M40 30 a6 6 0 0 1 12 0 q0 4 4 4 h10 v10 q0 4 4 4 a6 6 0 0 1 0 12 q-4 0 -4 4 v10 H56 q-4 0 -4 -4 a6 6 0 0 0 -12 0 q0 4 -4 4 H26 V58 q4 0 4 -4 a6 6 0 0 0 -10 -4"
        fill="#FBBC04"
        stroke="#F09A00"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
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
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L20 6 V11 c0 5 -3.5 8 -8 10 c-4.5 -2 -8 -5 -8 -10 V6 Z" />
      <path d="M12 8 V13" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" />
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
