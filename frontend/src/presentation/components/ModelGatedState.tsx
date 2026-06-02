/**
 * Rich "Gated or private model" page — used for the gated error kind (HTTP 403:
 * a private/gated repo Aakar can't read without a token). Mirrors the other
 * rich error pages and reuses their stylesheet; the artwork is a flat
 * illustration asset.
 */

import type { LoadError } from "../../application/loadError";
import illustrationUrl from "./model-gated.svg";
import styles from "./ModelNotFoundState.module.css";

export function ModelGatedState({ error }: { error: LoadError }) {
  return (
    <div className={styles.root} role="alert" aria-live="polite">
      <div className={styles.copy}>
        <div className={styles.badge}>
          <BadgeMark />
        </div>

        <h1 className={styles.title}>Gated or private model</h1>
        <p className={styles.subtitle}>
          This model is private or gated on the Hub. Aakar reads public models
          only &mdash; it sends no HuggingFace token &mdash; so it can&rsquo;t open this one.
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
          <li className={styles.tip}>
            <span className={styles.tipIcon} data-tone="blue"><LockIcon /></span>
            Aakar reads public models only (it uses no token)
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} data-tone="green"><GlobeIcon /></span>
            Load a public model to explore its architecture
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} data-tone="yellow"><ExternalIcon /></span>
            View this model on huggingface.co
          </li>
        </ul>
      </div>

      <div className={styles.art}>
        <img src={illustrationUrl} alt="" aria-hidden="true" className={styles.artImg} />
      </div>
    </div>
  );
}

/* Soft-blue badge: a closed padlock. */
function BadgeMark() {
  return (
    <svg viewBox="0 0 96 96" width="84" height="84" fill="none" role="img" aria-hidden="true">
      <circle cx="48" cy="48" r="48" fill="#E8F0FE" />
      <path d="M34 44 V36 a14 14 0 0 1 28 0 V44" stroke="#1A73E8" strokeWidth="5" strokeLinecap="round" />
      <rect x="28" y="43" width="40" height="33" rx="8" fill="#1A73E8" />
      <circle cx="48" cy="57" r="5" fill="#fff" />
      <rect x="45.5" y="60" width="5" height="9" rx="2.5" fill="#fff" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21" />
      <path d="M12 3 a14 14 0 0 1 0 18 a14 14 0 0 1 0 -18" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4 H20 V10" />
      <path d="M20 4 L11 13" />
      <path d="M18 14 v5 a1 1 0 0 1 -1 1 H5 a1 1 0 0 1 -1 -1 V7 a1 1 0 0 1 1 -1 h5" />
    </svg>
  );
}
