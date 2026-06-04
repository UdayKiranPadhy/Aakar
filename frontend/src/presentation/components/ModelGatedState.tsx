/**
 * Rich "Gated or private model" page (HTTP 403). Two ways forward:
 *   1. Access the model directly with a HuggingFace read token. The token is
 *      sent only with the retry request (as a header), and persisted to this
 *      browser only if the user opts to "remember" it — never logged.
 *   2. Alternative options — a public community mirror, or the model's Hub page.
 * Reuses the shared two-column layout/stylesheet; the artwork is a flat asset.
 */

import { useState } from "react";
import type { FormEvent } from "react";

import type { LoadError } from "../../application/loadError";
import { useArchStore } from "../../store/archStore";
import illustrationUrl from "./model-gated.svg";
import shared from "./ModelNotFoundState.module.css";
import styles from "./ModelGatedState.module.css";

export function ModelGatedState({
  error,
  onRetryWithToken,
}: {
  error: LoadError;
  onRetryWithToken?: (modelId: string, token: string) => void;
}) {
  const storedToken = useArchStore((s) => s.hfToken);
  const setHfToken = useArchStore((s) => s.setHfToken);
  const [token, setToken] = useState(storedToken ?? "");
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(true);

  const modelId = error.modelId;
  const trimmed = token.trim();
  const canSubmit = Boolean(trimmed && modelId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || !modelId) return;
    // Persist (opt-in) + reuse for later searches, then retry this model now.
    setHfToken(trimmed, remember);
    onRetryWithToken?.(modelId, trimmed);
  };

  const hubUrl = modelId ? `https://huggingface.co/${modelId}` : "https://huggingface.co/models";
  const baseName = modelId ? (modelId.split("/").pop() ?? modelId) : "";
  const mirrorSearch = `https://huggingface.co/models?search=${encodeURIComponent(baseName)}`;

  return (
    <div className={shared.root} role="alert" aria-live="polite">
      <div className={shared.copy}>
        <div className={shared.badge}>
          <BadgeMark />
        </div>

        <h1 className={shared.title}>Gated or private model</h1>
        <p className={shared.subtitle}>
          This model is gated or private on the Hub. Sign in with a HuggingFace read
          token to open it, or try a public mirror &mdash; Aakar sends no token unless
          you provide one.
        </p>

        {modelId && (
          <div className={shared.requested}>
            <span className={shared.requestedLabel}>model</span>
            <code className={shared.requestedId}>{modelId}</code>
          </div>
        )}

        <hr className={shared.divider} />

        {/* 1 — access this model with a read token */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>Access this model</p>
          <p className={styles.sectionHint}>This model requires Hugging Face authentication.</p>
          <form className={styles.form} onSubmit={submit}>
            <div className={styles.inputWrap}>
              <input
                className={styles.input}
                type={reveal ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="hf_…"
                aria-label="HuggingFace read token"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                type="button"
                className={styles.reveal}
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? "Hide token" : "Show token"}
              >
                {reveal ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember token locally
              <span
                className={styles.info}
                title="Stored in this browser's local storage and sent only to your Aakar backend. Uncheck to keep it for this session only."
              >
                <InfoIcon />
              </span>
            </label>

            <button type="submit" className={styles.submit} disabled={!canSubmit}>
              <LockIcon />
              Access Model
            </button>
          </form>
        </section>

        {/* 2 — alternatives that need no token */}
        <section className={styles.alt}>
          <p className={styles.sectionTitle}>Alternative options</p>
          <ul className={styles.altList}>
            <li>
              <a
                className={styles.altRow}
                href={mirrorSearch}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span className={styles.altIcon} data-tone="purple">
                  <MirrorIcon />
                </span>
                <span className={styles.altText}>
                  Open a public community mirror &mdash; e.g. an <code>unsloth/</code> re-upload
                </span>
                <span className={styles.altChevron}>
                  <ChevronIcon />
                </span>
              </a>
            </li>
            <li>
              <a className={styles.altRow} href={hubUrl} target="_blank" rel="noreferrer noopener">
                <span className={styles.altIcon} data-tone="yellow">
                  <ExternalIcon />
                </span>
                <span className={styles.altText}>View this model on huggingface.co</span>
                <span className={styles.altChevron}>
                  <ChevronIcon />
                </span>
              </a>
            </li>
          </ul>
        </section>
      </div>

      <div className={shared.art}>
        <img src={illustrationUrl} alt="" aria-hidden="true" className={shared.artImg} />
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
/* Copy/duplicate glyph: a community re-upload is a public copy of the model. */
function MirrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15 H4 a1 1 0 0 1 -1 -1 V4 a1 1 0 0 1 1 -1 h10 a1 1 0 0 1 1 1 v1" />
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
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6 L15 12 L9 18" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12 S5 5 12 5 s10 7 10 7 -3 7 -10 7 -10 -7 -10 -7 Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3 L21 21" />
      <path d="M10.6 6.2 A9.7 9.7 0 0 1 12 5 c7 0 10 7 10 7 a17 17 0 0 1 -3 4" />
      <path d="M6.3 7.8 A17 17 0 0 0 2 12 s3 7 10 7 a9.6 9.6 0 0 0 4.1 -1" />
      <path d="M9.9 9.9 A3 3 0 0 0 14.1 14.1" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11 V16" />
      <circle cx="12" cy="8" r="0.6" fill="currentColor" />
    </svg>
  );
}
