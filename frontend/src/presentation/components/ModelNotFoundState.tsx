/**
 * Rich "Model not found" page — a dedicated two-column layout (guidance on the
 * left, a flat search illustration on the right). Used only for the not_found
 * error kind; every other kind falls back to the compact ErrorState.
 */

import type { LoadError } from "../../application/loadError";
import { ModelNotFoundIllustration } from "./ModelNotFoundIllustration";
import { RetryButton } from "./RetryButton";
import styles from "./ModelNotFoundState.module.css";

export function ModelNotFoundState({
  error,
  onRetry,
}: {
  error: LoadError;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.root} role="alert" aria-live="polite">
      <div className={styles.copy}>
        <div className={styles.badge}>
          <BadgeMark />
        </div>

        <h1 className={styles.title}>Model not found</h1>
        <p className={styles.subtitle}>
          We couldn&rsquo;t find the model you&rsquo;re looking for. It may have been moved,
          renamed, or doesn&rsquo;t exist.
        </p>

        {error.modelId && (
          <div className={styles.requested}>
            <span className={styles.requestedLabel}>requested</span>
            <code className={styles.requestedId}>{error.modelId}</code>
          </div>
        )}

        <hr className={styles.divider} />

        <p className={styles.tryLabel}>What you can try:</p>
        <ul className={styles.tips}>
          <li className={styles.tip}>
            <span className={styles.tipIcon} data-tone="blue"><SearchIcon /></span>
            Check the model id for typos
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} data-tone="green"><ListIcon /></span>
            Browse available models on huggingface.co
          </li>
          <li className={styles.tip}>
            <span className={styles.tipIcon} data-tone="yellow"><HelpIcon /></span>
            Try a stock architecture (Llama, Qwen, GPT-2…)
          </li>
        </ul>

        {onRetry && (
          <div className={styles.actions}>
            <RetryButton onRetry={onRetry} />
          </div>
        )}
      </div>

      <div className={styles.art}>
        <div className={styles.stage}>
          <ModelNotFoundIllustration />
          {/* The source SVG's floating UI (search + chips on the left, the
              "Requested model" card on the right) is rendered as faint outlined
              paths. Each sits on the art's white field, away from the character,
              so we mask those corners and redraw them as crisp DOM. */}
          <SearchOverlay />
          <RequestedOverlay />
        </div>
      </div>
    </div>
  );
}

/* Crisp replacement for the illustration's faint search bar + model chips
 * (top-left white field). */
function SearchOverlay() {
  return (
    <div className={styles.searchOverlay} aria-hidden="true">
      <div className={styles.searchBar}>
        <span className={styles.searchIcon}>
          <SearchIcon />
        </span>
        <span className={styles.searchText}>Searching for model…</span>
      </div>
      <Chip tone="blue" name="GPT">
        <NetGlyph />
      </Chip>
      <Chip tone="green" name="Gemini">
        <LayersGlyph />
      </Chip>
      <Chip tone="yellow" name="Claude">
        <BurstGlyph />
      </Chip>
    </div>
  );
}

function Chip({
  tone,
  name,
  children,
}: {
  tone: "blue" | "green" | "yellow";
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.chip}>
      <span className={styles.chipTile} data-tone={tone}>
        {children}
      </span>
      <span className={styles.chipLines}>
        <span className={styles.chipName}>{name}</span>
        <span className={styles.chipSub} />
      </span>
    </div>
  );
}

/* Crisp replacement for the illustration's faint, rotated "Requested model"
 * card. Tilted (drifting away) with a dashed arrow up to the "Not found" badge.
 * Positioned over the art's top-right white field (no character there). */
function RequestedOverlay() {
  return (
    <div className={styles.reqOverlay} aria-hidden="true">
      <span className={styles.notFoundPill}>
        <span className={styles.notFoundDot}>!</span>
        Not found
      </span>
      <svg className={styles.reqArrow} viewBox="0 0 120 90" fill="none" aria-hidden="true">
        <path
          d="M12 80 C44 80 92 70 104 20"
          stroke="var(--color-hairline-strong)"
          strokeWidth="2.5"
          strokeDasharray="5 7"
          strokeLinecap="round"
        />
        <path d="M96 18 L106 13 L107 26 Z" fill="var(--color-hairline-strong)" />
      </svg>
      <div className={styles.reqCard}>
        <span className={styles.reqIcon}>
          <BrokenLinkIcon />
        </span>
        <span className={styles.reqTitle}>Requested model</span>
        <span className={styles.reqBar} />
        <span className={styles.reqBar} data-short />
      </div>
    </div>
  );
}

/* Chip tile glyphs (white on a colored tile, centered in a 38px box). */
function NetGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="15" y2="9" />
      <line x1="17" y1="17" x2="9" y2="9" />
      <circle cx="12" cy="6" r="2.4" fill="currentColor" />
      <circle cx="5.5" cy="18" r="2.4" fill="currentColor" />
      <circle cx="18.5" cy="18" r="2.4" fill="currentColor" />
    </svg>
  );
}
function LayersGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 L20 8 L12 12 L4 8 Z" />
      <path d="M4 12 L12 16 L20 12" />
      <path d="M4 16 L12 20 L20 16" />
    </svg>
  );
}
function BurstGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

function BrokenLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 7 H7 a5 5 0 0 0 0 10 h2" />
      <path d="M15 7 h2 a5 5 0 0 1 0 10 h-2" />
      <line x1="8.5" y1="4" x2="9.5" y2="6" />
      <line x1="15.5" y1="4" x2="14.5" y2="6" />
      <line x1="8.5" y1="20" x2="9.5" y2="18" />
      <line x1="15.5" y1="20" x2="14.5" y2="18" />
    </svg>
  );
}

/* Soft-blue badge: a magnifier with the model/network glyph in its lens. */
function BadgeMark() {
  return (
    <svg viewBox="0 0 96 96" width="84" height="84" fill="none" role="img" aria-hidden="true">
      <circle cx="48" cy="48" r="48" fill="#E8F0FE" />
      <circle cx="44" cy="44" r="22" fill="#FFFFFF" stroke="#1A73E8" strokeWidth="5" />
      <line x1="60" y1="60" x2="74" y2="74" stroke="#1A73E8" strokeWidth="7" strokeLinecap="round" />
      <g stroke="#1A73E8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" transform="translate(44 44)">
        <line x1="-8" y1="7" x2="6" y2="-6" />
        <line x1="8" y1="7" x2="-6" y2="-6" />
        <circle cx="0" cy="-8" r="3.6" fill="#1A73E8" />
        <circle cx="-9" cy="8" r="3.6" fill="#1A73E8" />
        <circle cx="9" cy="8" r="3.6" fill="#1A73E8" />
      </g>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.7" y2="16.7" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.2 a2.8 2.8 0 0 1 4.6 2 c0 1.8 -2.6 2.2 -2.6 3.6" />
      <circle cx="11.6" cy="17.4" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
