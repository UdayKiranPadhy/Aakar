/**
 * One labeled model-id search bar for a Compare column. Controlled by the parent
 * (CompareHost's working header or the CompareLanding hero) so the two bars can be
 * swapped. Submitting (Enter, or picking a suggestion) loads the trimmed id; an
 * inline spinner shows while loading and an inline error shows below. Autocomplete
 * + featured ids come from the shared `ModelCombobox`.
 *
 * Two presentations:
 *   - default (compact header) — a small field under a visible label.
 *   - `size="lg"` (Compare landing) — a taller, Google-Flights-style field with a
 *     `leadingIcon` inside its leading edge and the label folded into the
 *     placeholder (`hideLabel`). `loaded` turns the leading icon into a green ✓.
 */

import type { ReactNode } from "react";
import { clsx } from "clsx";

import { ModelCombobox } from "../components/ModelCombobox";
import type { Tone } from "./primitives";
import styles from "./CompareSearchBar.module.css";

const DEFAULT_PLACEHOLDER = "HuggingFace model id — e.g. meta-llama/Llama-3-8B";

type Props = {
  label: string;
  tone: Tone;
  value: string;
  loading: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: (modelId: string) => void;
  /** "lg" = the Compare-landing hero variant; defaults to the compact header bar. */
  size?: "sm" | "lg";
  /** When true, this column's model is loaded — shows a ✓ (label, or leading icon). */
  loaded?: boolean;
  placeholder?: string;
  /** Icon inside the field's leading edge (hero variant); replaced by a ✓ once loaded. */
  leadingIcon?: ReactNode;
  /** Hide the visible label (hero variant folds it into the placeholder); aria-label is kept. */
  hideLabel?: boolean;
};

export function CompareSearchBar({
  label,
  tone,
  value,
  loading,
  error,
  onChange,
  onSubmit,
  size = "sm",
  loaded = false,
  placeholder = DEFAULT_PLACEHOLDER,
  leadingIcon,
  hideLabel = false,
}: Props) {
  const lg = size === "lg";
  const toneClass = tone === "a" ? styles.toneA : styles.toneB;
  const hasIcon = leadingIcon !== undefined || loaded;

  return (
    <div className={clsx(styles.col, lg && styles.colLg)}>
      {!hideLabel && (
        <span className={clsx(styles.label, lg && styles.labelLg, toneClass)}>
          {label}
          {loaded && (
            <span className={styles.check} aria-label="loaded">
              ✓
            </span>
          )}
        </span>
      )}
      <div className={styles.field}>
        {hasIcon && (
          <span className={clsx(styles.leading, toneClass, loaded && styles.leadingLoaded)} aria-hidden="true">
            {loaded ? <CheckGlyph /> : leadingIcon}
          </span>
        )}
        <ModelCombobox
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          loading={loading}
          ariaLabel={label}
          placeholder={placeholder}
          inputClassName={clsx(styles.input, lg && styles.inputLg, hasIcon && styles.inputWithIcon)}
        />
      </div>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
