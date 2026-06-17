/**
 * Concepts — a searchable, filterable library of core AI / LLM ideas. A card
 * grid on the left; a tabbed detail panel (Overview / Visualization / How it
 * Works / Mathematics / Resources) on the right for the selected concept.
 * Entirely static content from `content/concepts`.
 */

import { useMemo, useState } from "react";
import { clsx } from "clsx";

import { CONCEPTS } from "../learn/content/concepts";
import type { Concept } from "../learn/content/types";
import { TopicGlyph } from "../learn/LearnGlyphs";
import {
  CategoryChip,
  IconBadge,
  LevelDots,
  PageHeader,
  SearchInput,
  Tag,
  categoryTone,
  toneClass,
} from "../learn/primitives";
import styles from "./ConceptsLearnView.module.css";

type Tab = "overview" | "viz" | "how" | "math" | "resources";
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
  const [selectedId, setSelectedId] = useState<string>(CONCEPTS[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [sort, setSort] = useState<Sort>("Popular");
  const [tab, setTab] = useState<Tab>("overview");
  const [bookmarks, setBookmarks] = useState<ReadonlySet<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byFilter = CONCEPTS.filter(
      (c) =>
        (category === ALL || c.category === category) &&
        (q === "" || c.name.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q)),
    );
    return sortConcepts(byFilter, sort);
  }, [query, category, sort]);

  const selected = CONCEPTS.find((c) => c.id === selectedId) ?? CONCEPTS[0];

  const selectConcept = (c: Concept) => {
    setSelectedId(c.id);
    setTab("overview");
  };
  const selectByName = (name: string) => {
    const match = CONCEPTS.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (match) selectConcept(match);
  };
  const toggleBookmark = (id: string) =>
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const tabs: ReadonlyArray<{ key: Tab; label: string; show: boolean }> = [
    { key: "overview", label: "Overview", show: true },
    { key: "viz", label: "Visualization", show: true },
    { key: "how", label: "How it Works", show: true },
    { key: "math", label: "Mathematics", show: selected ? selected.math.length > 0 : false },
    { key: "resources", label: "Resources", show: true },
  ];
  const activeTab = tabs.find((t) => t.key === tab)?.show ? tab : "overview";

  return (
    <div className={styles.view}>
      <PageHeader
        title="Concepts"
        subtitle="Explore core AI concepts with simple explanations, visualizations and curated resources to deepen your understanding."
      />

      <div className={styles.layout}>
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
              {filtered.map((c) => {
                const active = selected?.id === c.id;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    onClick={() => selectConcept(c)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectConcept(c);
                      }
                    }}
                    className={clsx(styles.conceptCard, active && styles.conceptCardActive)}
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
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <aside className={styles.detail} key={selected.id}>
            <div className={styles.detailBar}>
              <span className={styles.detailBarHint}>Concept detail</span>
              <button
                type="button"
                className={clsx(styles.bookmarkBtn, bookmarks.has(selected.id) && styles.bookmarkBtnOn)}
                onClick={() => toggleBookmark(selected.id)}
              >
                <BookmarkGlyph filled={bookmarks.has(selected.id)} />
                {bookmarks.has(selected.id) ? "Bookmarked" : "Add to bookmarks"}
              </button>
            </div>

            <div className={styles.detailHead}>
              <IconBadge tone={categoryTone(selected.category)} size="lg">
                <TopicGlyph topic={`${selected.category} ${selected.name}`} />
              </IconBadge>
              <div className={styles.detailHeadText}>
                <div className={styles.detailTitleRow}>
                  <h2 className={styles.detailTitle}>{selected.name}</h2>
                  <CategoryChip category={selected.category} />
                </div>
                <p className={styles.detailSummary}>{selected.summary}</p>
              </div>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Level</span>
                <span className={styles.statValue}>{selected.level}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Read time</span>
                <span className={styles.statValue}>{selected.readMinutes} min</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Difficulty</span>
                <LevelDots value={selected.difficulty} tone={categoryTone(selected.category)} />
              </div>
            </div>

            <div className={styles.tabs} role="tablist">
              {tabs
                .filter((t) => t.show)
                .map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.key}
                    className={clsx(styles.tab, activeTab === t.key && styles.tabActive)}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
            </div>

            <div className={styles.tabBody}>
              {activeTab === "overview" && (
                <>
                  <h3 className={styles.h3}>What is {selected.name}?</h3>
                  <p className={styles.para}>{selected.overview}</p>
                  <h3 className={styles.h3}>Key takeaways</h3>
                  <ul className={styles.checks}>
                    {selected.keyTakeaways.map((k) => (
                      <li key={k} className={styles.check}>
                        <span aria-hidden="true" className={styles.checkTick}>✓</span>
                        {k}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {activeTab === "viz" && <ConceptViz concept={selected} />}

              {activeTab === "how" && (
                <ol className={styles.steps}>
                  {selected.howItWorks.map((step, i) => (
                    <li key={step} className={styles.step}>
                      <span className={clsx(styles.stepNum, toneClass(categoryTone(selected.category)))}>
                        {i + 1}
                      </span>
                      <span className={styles.stepText}>{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {activeTab === "math" && (
                <div className={styles.mathList}>
                  {selected.math.map((m) => (
                    <div key={m.label} className={styles.mathBlock}>
                      <span className={styles.mathLabel}>{m.label}</span>
                      <code className={styles.formula}>{m.formula}</code>
                      {m.note && <p className={styles.mathNote}>{m.note}</p>}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "resources" && (
                <div className={styles.resources}>
                  {selected.resources.map((r) => (
                    <a key={r.title} href={r.href} target="_blank" rel="noreferrer" className={styles.resource}>
                      <span className={styles.resourceKind}>{r.kind}</span>
                      <span className={styles.resourceTitle}>{r.title}</span>
                      <span aria-hidden="true" className={styles.resourceArrow}>↗</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.related}>
              <h3 className={styles.h3}>Related concepts</h3>
              <div className={styles.relatedTags}>
                {selected.related.map((r) => (
                  <Tag key={r} onClick={() => selectByName(r)}>
                    {r}
                  </Tag>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* A lightweight, generic attention-style flow diagram for the Visualization
 * tab — illustrative rather than concept-exact, and works for any concept. */
function ConceptViz({ concept }: { concept: Concept }) {
  const tone = categoryTone(concept.category);
  return (
    <div className={styles.viz}>
      <div className={clsx(styles.vizTokens)}>
        {["The", "cat", "sat", "on", "the", "mat"].map((t, i) => (
          <span key={`${t}-${i}`} className={styles.vizToken}>
            {t}
          </span>
        ))}
      </div>
      <div className={styles.vizFlow}>
        <span className={clsx(styles.vizBlock, toneClass(tone))}>
          <TopicGlyph topic={`${concept.category} ${concept.name}`} />
          {concept.name}
        </span>
        <span aria-hidden="true" className={styles.vizArrow}>↓</span>
        <span className={styles.vizOutput}>Output</span>
      </div>
      <p className={styles.vizCaption}>
        Illustrative: input tokens flow into the {concept.name.toLowerCase()} mechanism, which produces the next
        representation. Interactive visualizers are in the Interactive Visualizations section.
      </p>
    </div>
  );
}

function BookmarkGlyph({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}
