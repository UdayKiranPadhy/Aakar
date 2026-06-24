/**
 * Concept detail — a full-page, shareable view of a single concept. Promoted
 * out of the old right-hand dock so long concepts have room to breathe and the
 * URL (`/learn?view=concepts&concept=<id>`) deep-links straight to it. The
 * parent (`ConceptsLearnView`) renders this whenever the store's `conceptId`
 * resolves to a concept, and the card grid otherwise; it keys this on the
 * concept id so navigating to a related concept resets the tab + scroll.
 */

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

import type { Concept } from "../learn/content/types";
import { BookmarkGlyph, TopicGlyph } from "../learn/LearnGlyphs";
import { CategoryChip, IconBadge, LevelDots, Tag, categoryTone, toneClass } from "../learn/primitives";
import styles from "./ConceptDetailView.module.css";

type Tab = "overview" | "viz" | "how" | "math" | "resources";

type Props = Readonly<{
  concept: Concept;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onBack: () => void;
  /** Open another concept by display name (the "Related concepts" links). */
  onOpenRelated: (name: string) => void;
}>;

export function ConceptDetailView({ concept, bookmarked, onToggleBookmark, onBack, onOpenRelated }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Opening a concept starts at the top of the Learn content scroller, not
  // wherever the grid was left. The parent remounts this on concept change
  // (keyed), so an empty dependency list is enough.
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: "start" });
  }, []);

  const tabs: ReadonlyArray<{ key: Tab; label: string; show: boolean }> = [
    { key: "overview", label: "Overview", show: true },
    { key: "viz", label: "Visualization", show: true },
    { key: "how", label: "How it Works", show: true },
    { key: "math", label: "Mathematics", show: concept.math.length > 0 },
    { key: "resources", label: "Resources", show: true },
  ];
  const activeTab = tabs.find((t) => t.key === tab)?.show ? tab : "overview";

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (insecure context / denied) — leave the URL for manual copy */
    }
  };

  return (
    <article ref={rootRef} className={styles.page}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <span aria-hidden="true">←</span> Back to Concepts
        </button>
        <div className={styles.topActions}>
          <button
            type="button"
            className={clsx(styles.actionBtn, bookmarked && styles.actionBtnOn)}
            onClick={onToggleBookmark}
          >
            <BookmarkGlyph filled={bookmarked} />
            {bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
          <button type="button" className={styles.actionBtn} onClick={share}>
            <ShareGlyph />
            {copied ? "Link copied" : "Share"}
          </button>
        </div>
      </div>

      <header className={styles.head}>
        <IconBadge tone={categoryTone(concept.category)} size="lg">
          <TopicGlyph topic={`${concept.category} ${concept.name}`} />
        </IconBadge>
        <div className={styles.headText}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{concept.name}</h1>
            <CategoryChip category={concept.category} />
          </div>
          <p className={styles.summary}>{concept.summary}</p>
        </div>
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Level</span>
          <span className={styles.statValue}>{concept.level}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Read time</span>
          <span className={styles.statValue}>{concept.readMinutes} min</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Difficulty</span>
          <LevelDots value={concept.difficulty} tone={categoryTone(concept.category)} />
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
            <h2 className={styles.h3}>What is {concept.name}?</h2>
            <p className={styles.para}>{concept.overview}</p>
            <h2 className={styles.h3}>Key takeaways</h2>
            <ul className={styles.checks}>
              {concept.keyTakeaways.map((k) => (
                <li key={k} className={styles.check}>
                  <span aria-hidden="true" className={styles.checkTick}>
                    ✓
                  </span>
                  {k}
                </li>
              ))}
            </ul>
          </>
        )}

        {activeTab === "viz" && <ConceptViz concept={concept} />}

        {activeTab === "how" && (
          <ol className={styles.steps}>
            {concept.howItWorks.map((step, i) => (
              <li key={step} className={styles.step}>
                <span className={clsx(styles.stepNum, toneClass(categoryTone(concept.category)))}>{i + 1}</span>
                <span className={styles.stepText}>{step}</span>
              </li>
            ))}
          </ol>
        )}

        {activeTab === "math" && (
          <div className={styles.mathList}>
            {concept.math.map((m) => (
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
            {concept.resources.map((r) => (
              <a key={r.title} href={r.href} target="_blank" rel="noreferrer" className={styles.resource}>
                <span className={styles.resourceKind}>{r.kind}</span>
                <span className={styles.resourceTitle}>{r.title}</span>
                <span aria-hidden="true" className={styles.resourceArrow}>
                  ↗
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className={styles.related}>
        <h2 className={styles.h3}>Related concepts</h2>
        <div className={styles.relatedTags}>
          {concept.related.map((r) => (
            <Tag key={r} onClick={() => onOpenRelated(r)}>
              {r}
            </Tag>
          ))}
        </div>
      </div>
    </article>
  );
}

/* A lightweight, generic attention-style flow diagram for the Visualization
 * tab — illustrative rather than concept-exact, and works for any concept. */
function ConceptViz({ concept }: { concept: Concept }) {
  const tone = categoryTone(concept.category);
  return (
    <div className={styles.viz}>
      <div className={styles.vizTokens}>
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
        <span aria-hidden="true" className={styles.vizArrow}>
          ↓
        </span>
        <span className={styles.vizOutput}>Output</span>
      </div>
      <p className={styles.vizCaption}>
        Illustrative: input tokens flow into the {concept.name.toLowerCase()} mechanism, which produces the next
        representation.
      </p>
    </div>
  );
}

function ShareGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
    </svg>
  );
}
