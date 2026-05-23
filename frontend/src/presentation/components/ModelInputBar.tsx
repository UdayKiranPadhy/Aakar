/**
 * Pill-style search input for pasting a HuggingFace model ID.
 *
 * Submits on Enter; no explicit submit button (Google-News style). Inline
 * spinner on the right while loading; the error string (if any) renders below
 * the pill so it doesn't collide with the centered layout.
 */

import { type FormEvent } from "react";

import { useArchStore } from "../../store/archStore";
import { Spinner } from "./ui/Spinner";
import styles from "./ModelInputBar.module.css";

type Props = {
  onSubmit: (modelId: string) => void;
};

export function ModelInputBar({ onSubmit }: Props) {
  const modelInput = useArchStore((s) => s.modelInput);
  const setModelInput = useArchStore((s) => s.setModelInput);
  const loading = useArchStore((s) => s.loading);
  const error = useArchStore((s) => s.error);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const trimmed = modelInput.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className={styles.wrapper}>
      <form onSubmit={handleSubmit} role="search" className={styles.form}>
        <span aria-hidden="true" className={styles.searchIcon}>
          <SearchIcon />
        </span>
        <input
          type="text"
          name="model_id"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search a HuggingFace model — e.g. meta-llama/Llama-3-8B"
          aria-label="HuggingFace model ID"
          value={modelInput}
          onChange={(e) => setModelInput(e.target.value)}
          disabled={loading}
          className={styles.input}
        />
        {loading && (
          <span className={styles.spinnerSlot}>
            <Spinner />
          </span>
        )}
      </form>
      {error && (
        <div role="alert" className={styles.error} title={error}>
          {error}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.65" y2="16.65" />
    </svg>
  );
}
