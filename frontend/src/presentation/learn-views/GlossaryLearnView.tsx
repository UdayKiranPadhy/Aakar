/**
 * Glossary — searchable, A–Z definitions of AI / LLM terms. Static content.
 */

import { useMemo, useState } from "react";
import { clsx } from "clsx";

import { GLOSSARY } from "../learn/content/glossary";
import { EmptyState, PageHeader, SearchInput, Tag } from "../learn/primitives";
import styles from "./sections.module.css";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function GlossaryLearnView() {
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>(null);

  const sorted = useMemo(() => [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term)), []);
  const available = useMemo(
    () => new Set(sorted.map((t) => t.term[0]?.toUpperCase()).filter(Boolean)),
    [sorted],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter(
      (t) =>
        (letter === null || t.term[0]?.toUpperCase() === letter) &&
        (q === "" ||
          t.term.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q) ||
          (t.abbr ?? "").toLowerCase().includes(q)),
    );
  }, [sorted, query, letter]);

  return (
    <div className={styles.view}>
      <PageHeader
        title="Glossary"
        subtitle="Plain-English definitions for the AI and LLM terms you'll meet across Aakar."
        actions={<span className={styles.count}>{GLOSSARY.length} terms</span>}
      />

      <div className={styles.glossaryTop}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search terms…" />
        <div className={styles.letters}>
          <button
            type="button"
            className={clsx(styles.letter, letter === null && styles.letterActive)}
            onClick={() => setLetter(null)}
          >
            All
          </button>
          {LETTERS.map((l) => (
            <button
              key={l}
              type="button"
              disabled={!available.has(l)}
              className={clsx(styles.letter, letter === l && styles.letterActive)}
              onClick={() => setLetter(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No terms found" message="Try a different search or letter." />
      ) : (
        <div className={styles.terms}>
          {filtered.map((t) => (
            <article key={t.term} className={styles.termCard}>
              <h2 className={styles.termWord}>
                {t.term}
                {t.abbr && <span className={styles.termAbbr}>{t.abbr}</span>}
              </h2>
              <p className={styles.termDef}>{t.definition}</p>
              {t.related.length > 0 && (
                <div className={styles.termRelated}>
                  <span className={styles.termRelatedLabel}>Related:</span>
                  {t.related.map((r) => (
                    <Tag key={r}>{r}</Tag>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
