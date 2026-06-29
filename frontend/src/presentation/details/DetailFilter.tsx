/**
 * A small filter input + a pure key-substring predicate, used by the detail panel
 * to narrow its long lists (params, buffers, submodules) on large models. The
 * panel owns the query string; this stays dumb (one concept per file).
 */

import styles from "./GenericDetailPanel.module.css";

export function DetailFilter({
  value,
  onChange,
  placeholder = "Filter fields…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      className={styles.filter}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Filter detail fields"
    />
  );
}

/** Keep entries whose key contains `query` (case-insensitive). Empty query ⇒ all. */
export function filterEntries<T>(
  entries: ReadonlyArray<readonly [string, T]>,
  query: string,
): ReadonlyArray<readonly [string, T]> {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(([key]) => key.toLowerCase().includes(q));
}
