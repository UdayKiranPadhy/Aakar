/**
 * Concepts — a searchable, filterable library of core AI / LLM ideas, shown as
 * a card grid. Selecting a card opens that concept on its own shareable page
 * (`ConceptDetailView`), driven by the store's `conceptId` ⇄ the URL's
 * `?concept=` param; the grid is the index you return to.
 *
 * Filter / sort / bookmark state stays local: it's ephemeral browse state, not
 * part of the shareable URL, and it survives the grid⇄detail switch because
 * this component stays mounted (the Learn section, `concepts`, never changes —
 * only `conceptId` toggles).
 */

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import { CONCEPTS } from "../learn/content/concepts";
import type { Concept } from "../learn/content/types";
import { BookmarkGlyph, TopicGlyph } from "../learn/LearnGlyphs";
import { CategoryChip, IconBadge, PageHeader, SearchInput, categoryTone } from "../learn/primitives";
import { ConceptDetailView } from "./ConceptDetailView";
import styles from "./ConceptsLearnView.module.css";

const ALL = "All Categories";
const CATEGORIES = [ALL, ...Array.from(new Set(CONCEPTS.map((c) => c.category)))];
const SORTS = ["Popular", "A–Z", "Difficulty", "Read time"] as const;
type Sort = (typeof SORTS)[number];

function sortConcepts(list: ReadonlyArray<Concept>, sort: Sort): ReadonlyArray<Concept> {
  const copy = [...list];
  switch (sort) {
    case "A–Z":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "Difficulty":
      return copy.sort((a, b) => a.difficulty - b.difficulty);
    case "Read time":
      return copy.sort((a, b) => a.readMinutes - b.readMinutes);
    default:
      return copy; // "Popular" — authored order
  }
}

export function ConceptsLearnView() {
  const conceptId = useArchStore((s) => s.conceptId);
  const setConceptId = useArchStore((s) => s.setConceptId);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [sort, setSort] = useState<Sort>("Popular");
  const [bookmarks, setBookmarks] = useState<ReadonlySet<string>>(new Set());

  const selected = conceptId ? CONCEPTS.find((c) => c.id === conceptId) ?? null : null;

  // Self-heal a stale / unknown `?concept=` (e.g. an old shared link or a typo):
  // drop it so the URL matches what we actually show (the grid).
  useEffect(() => {
    if (conceptId && !selected) setConceptId(null);
  }, [conceptId, selected, setConceptId]);

  const toggleBookmark = (id: string) =>
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openByName = (name: string) => {
    const match = CONCEPTS.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match) setConceptId(match.id);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byFilter = CONCEPTS.filter(
      (c) =>
        (category === ALL || c.category === category) &&
        (q === "" || c.name.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q)),
    );
    return sortConcepts(byFilter, sort);
  }, [query, category, sort]);

  if (selected) {
    return (
      <ConceptDetailView
        key={selected.id}
        concept={selected}
        bookmarked={bookmarks.has(selected.id)}
        onToggleBookmark={() => toggleBookmark(selected.id)}
        onBack={() => setConceptId(null)}
        onOpenRelated={openByName}
      />
    );
  }

  return (
    <div className={styles.view}>
      <PageHeader
        title="Concepts"
        subtitle="Explore core AI concepts with simple explanations, visualizations and curated resources to deepen your understanding."
      />

      <div className={styles.left}>
        <div className={styles.toolbar}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search concepts…" />
          <select
            className={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort concepts"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                Sort: {s}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.gridHead}>
          <h2 className={styles.gridTitle}>All Concepts</h2>
          <span className={styles.count}>{filtered.length} concepts</span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No concepts match your search</p>
            <p className={styles.emptyMsg}>Try a different term or clear the filters.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setConceptId(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setConceptId(c.id);
                  }
                }}
                className={styles.conceptCard}
              >
                <div className={styles.cardTop}>
                  <IconBadge tone={categoryTone(c.category)}>
                    <TopicGlyph topic={`${c.category} ${c.name}`} />
                  </IconBadge>
                  <button
                    type="button"
                    className={clsx(styles.bookmark, bookmarks.has(c.id) && styles.bookmarkOn)}
                    aria-label={bookmarks.has(c.id) ? "Remove bookmark" : "Add bookmark"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(c.id);
                    }}
                  >
                    <BookmarkGlyph filled={bookmarks.has(c.id)} />
                  </button>
                </div>
                <h3 className={styles.cardName}>{c.name}</h3>
                <p className={styles.cardSummary}>{c.summary}</p>
                <div className={styles.cardFoot}>
                  <CategoryChip category={c.category} />
                  <span className={styles.cardMeta}>
                    {c.level} · {c.readMinutes} min read
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
