/**
 * One labeled model-id search bar for a Compare column. Controlled by CompareHost
 * so the two bars can be swapped. Submitting (Enter) loads the trimmed id; an
 * inline spinner shows while loading and an inline error shows below.
 */

import { type FormEvent } from "react";
import { clsx } from "clsx";

import { Spinner } from "../components/ui/Spinner";
import type { Tone } from "./primitives";
import styles from "./CompareSearchBar.module.css";

type Props = {
  label: string;
  tone: Tone;
  value: string;
  loading: boolean;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: (modelId: string) => void;
};

export function CompareSearchBar({ label, tone, value, loading, error, onChange, onSubmit }: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className={styles.col}>
      <span className={clsx(styles.label, tone === "a" ? styles.toneA : styles.toneB)}>{label}</span>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          placeholder="HuggingFace model id — e.g. meta-llama/Llama-3-8B"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          disabled={loading}
        />
        {loading && <Spinner className={styles.spinner} />}
      </form>
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
