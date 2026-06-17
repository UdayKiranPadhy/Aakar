/**
 * A controlled HuggingFace model-id input with autocomplete.
 *
 * The reusable combobox behind the search surfaces that aren't wired to the
 * primary-model store: it's fully controlled (value / onChange / onSubmit), so
 * the Compare columns can each drive their own slot. As the user types it
 * suggests matching ids from the bundled, popularity-ranked list
 * (`useModelSearch` → `StaticModelSearchRepository`, client-side, no network);
 * an empty field offers the curated featured ids instead. Arrow keys move the
 * active option, Enter selects it (or submits the typed text), Escape closes.
 * Suggestions are assistance only — any typed id can still be submitted.
 *
 * The dropdown renders through a portal with fixed positioning so it escapes any
 * clipping / transformed ancestor (the Compare header lives in a constrained
 * flex layout). Field chrome is the caller's via `inputClassName`.
 *
 * (The nav's primary search uses the sibling `ModelInputBar`, which adds the
 * pill styling, leading icon, clear button and store wiring; both share the
 * same `useModelSearch` source.)
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
import { FEATURED_MODEL_IDS } from "../featuredModels";
import { Spinner } from "./ui/Spinner";
import styles from "./ModelCombobox.module.css";

const MIN_QUERY_LENGTH = 2;

type Anchor = { top: number; left: number; width: number };

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (modelId: string) => void;
  ariaLabel: string;
  placeholder?: string;
  loading?: boolean;
  /** Class applied to the `<input>` so the caller owns its field styling. */
  inputClassName?: string;
  /** Curated ids offered when the field is empty. */
  featured?: ReadonlyArray<string>;
  /** Injectable for tests; defaults to the bundled popular-models search. */
  searchRepo?: ModelSearchRepository;
};

export function ModelCombobox({
  value,
  onChange,
  onSubmit,
  ariaLabel,
  placeholder,
  loading = false,
  inputClassName,
  featured = FEATURED_MODEL_IDS,
  searchRepo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const trimmed = value.trim();
  const isSearching = trimmed.length >= MIN_QUERY_LENGTH;

  const { results, loading: searching } = useModelSearch(value, {
    enabled: open && !loading && isSearching,
    repo: searchRepo,
  });

  const suggestions = isSearching ? results : featured;
  const active = activeIndex >= 0 && activeIndex < suggestions.length ? activeIndex : -1;
  const hasContent = suggestions.length > 0 || (isSearching && !searching);
  const showList = open && !loading && hasContent;

  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  // Position the portalled dropdown under the input, tracking scroll/resize.
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

  // Close on any pointer-down outside the combobox or the (portalled) list.
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
    onChange(id);
    setOpen(false);
    setActiveIndex(-1);
    onSubmit(id);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const chosen = showList && active >= 0 ? suggestions[active] : undefined;
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
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
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
      <form className={styles.form} onSubmit={handleSubmit} role="search">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={placeholder}
          aria-label={ariaLabel}
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className={inputClassName}
        />
        {loading && <Spinner className={styles.spinner} />}
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
            {!isSearching && (
              <li className={styles.header} role="presentation">
                Try one of these
              </li>
            )}
            {suggestions.map((id, i) => (
              <li
                key={id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={`${styles.option} ${i === active ? styles.optionActive : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(id)}
              >
                {id}
              </li>
            ))}
            {isSearching && suggestions.length === 0 && (
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
