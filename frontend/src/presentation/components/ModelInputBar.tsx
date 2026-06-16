/**
 * Search input for a HuggingFace model ID, with autocomplete.
 *
 * Combobox pattern: as the user types, we suggest matching model ids from a
 * bundled popularity-ranked list (see `useModelSearch` / `StaticModelSearchRepository`)
 * — entirely client-side, no network call. Arrow keys move the active option,
 * Enter selects it (or submits the typed text when none is active), Escape closes
 * the list. Suggestions are assistance only: any typed id can still be submitted.
 * Load failures are surfaced by the dashboard's full ErrorState (see
 * ModelViewHost), not inline here.
 *
 * The dropdown renders through a portal with fixed positioning: this bar is
 * mounted inside the nav's `overflow: hidden` collapse row (and could land in
 * other clipping/transformed containers), so anchoring the list in normal flow
 * would clip it. The portal escapes any such ancestor.
 */

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { ModelSearchRepository } from "../../application/interfaces";
import { useModelSearch } from "../../application/useModelSearch";
import { useArchStore } from "../../store/archStore";
import { Spinner } from "./ui/Spinner";
import styles from "./ModelInputBar.module.css";

const MIN_QUERY_LENGTH = 2;

type Anchor = { top: number; left: number; width: number };

type Props = {
  onSubmit: (modelId: string) => void;
  /** Injectable for tests; defaults to the bundled popular-models search. */
  searchRepo?: ModelSearchRepository;
};

export function ModelInputBar({ onSubmit, searchRepo }: Props) {
  const modelInput = useArchStore((s) => s.modelInput);
  const setModelInput = useArchStore((s) => s.setModelInput);
  const loading = useArchStore((s) => s.loading);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Suggest only while the list is meant to be open and we're not mid model-load.
  const { results, loading: searching } = useModelSearch(modelInput, {
    enabled: open && !loading,
    repo: searchRepo,
  });

  const active = activeIndex >= 0 && activeIndex < results.length ? activeIndex : -1;
  const trimmed = modelInput.trim();
  // Render the listbox once there's something to show — results, or a settled
  // "no matches" — so it never flashes empty during the first lookup.
  const hasContent = results.length > 0 || (!searching && trimmed.length >= MIN_QUERY_LENGTH);
  const showList = open && !loading && trimmed.length >= MIN_QUERY_LENGTH && hasContent;

  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  // Position the portalled dropdown under the input, tracking scroll/resize so
  // it stays glued to the field (the field can scroll with the landing page).
  useLayoutEffect(() => {
    if (!showList) return;
    const update = () => {
      const r = containerRef.current?.getBoundingClientRect();
      if (r) setAnchor({ top: r.bottom, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showList]);

  // Close the list on any pointer-down outside the combobox or the (portalled)
  // list itself.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
      setActiveIndex(-1);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (id: string) => {
    setModelInput(id);
    setOpen(false);
    setActiveIndex(-1);
    onSubmit(id);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const chosen = showList && active >= 0 ? results[active] : undefined;
    if (chosen) {
      choose(chosen);
      return;
    }
    if (trimmed) {
      setOpen(false);
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!showList) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? 0 : i - 1));
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <form onSubmit={handleSubmit} role="search" className={styles.form}>
        <span aria-hidden="true" className={styles.searchIcon}>
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="text"
          name="model_id"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search a HuggingFace model — e.g. meta-llama/Llama-3-8B"
          aria-label="HuggingFace model ID"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          value={modelInput}
          onChange={(e) => {
            setModelInput(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (modelInput.trim().length >= MIN_QUERY_LENGTH) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className={styles.input}
        />
        {loading ? (
          <span className={styles.spinnerSlot}>
            <Spinner />
          </span>
        ) : modelInput ? (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Clear search"
            onClick={() => {
              setModelInput("");
              setOpen(false);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
          >
            <ClearIcon />
          </button>
        ) : null}
      </form>

      {showList &&
        anchor &&
        createPortal(
          <ul
            ref={listRef}
            className={styles.listbox}
            id={listboxId}
            role="listbox"
            aria-label="Model suggestions"
            style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
          >
            {results.map((id, i) => (
              <li
                key={id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={`${styles.option} ${i === active ? styles.optionActive : ""}`}
                // Keep focus on the input so the click isn't pre-empted by a blur.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(id)}
              >
                {id}
              </li>
            ))}
            {results.length === 0 && (
              <li className={styles.empty} role="presentation">
                No matching models
              </li>
            )}
          </ul>,
          document.body,
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

function ClearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
