/**
 * Research Papers — landmark papers that shaped modern AI. With no active
 * search/filter it shows curated rows (Foundation, Recent Breakthroughs, Browse
 * by Category) plus a right rail (Featured, Most Cited, Trending). Searching or
 * filtering collapses it to a single results grid. All content is static.
 */

import { useMemo, useState } from "react";

import {
  PAPERS,
  PAPER_CATEGORY_CARDS,
  PAPER_FILTERS,
  PAPER_TOTAL,
  PAPER_TRENDING_TOPICS,
} from "../learn/content/papers";
import type { Paper } from "../learn/content/types";
import { TopicGlyph } from "../learn/LearnGlyphs";
import { CategoryChip, EmptyState, IconBadge, SearchInput } from "../learn/primitives";
import styles from "./ResearchPapersLearnView.module.css";

const ALL_CATS = "All Categories";
const ALL_YEARS = "All Years";
const SORTS = ["Most Relevant", "Most Cited", "Newest", "Oldest"] as const;
type Sort = (typeof SORTS)[number];

const CATEGORIES = [ALL_CATS, ...Array.from(new Set(PAPERS.map((p) => p.category)))];
const YEARS = [ALL_YEARS, ...Array.from(new Set(PAPERS.map((p) => p.year))).sort((a, b) => b - a).map(String)];

const FOUNDATION = PAPERS.filter((p) => p.tag === "Foundation");
const RECENT = PAPERS.filter((p) => p.tag === "New");
const MOST_CITED = [...PAPERS].sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0)).slice(0, 5);
const FEATURED = PAPERS.find((p) => p.id === "attention") ?? PAPERS[0];

function PaperCard({ paper }: { paper: Paper }) {
  return (
    <article className={styles.paper}>
      <CategoryChip category={paper.tag} />
      <h3 className={styles.paperTitle}>{paper.title}</h3>
      <p className={styles.paperAuthors}>
        {paper.authors} · {paper.year}
      </p>
      <p className={styles.paperSummary}>{paper.summary}</p>
      <div className={styles.paperFoot}>
        <span className={styles.citations}>
          {paper.citations ? `${paper.citations.toLocaleString()} citations` : `${paper.readMinutes ?? 0} min read`}
        </span>
        {paper.href && (
          <a href={paper.href} target="_blank" rel="noreferrer" className={styles.pdf}>
            <PdfGlyph /> PDF
          </a>
        )}
      </div>
    </article>
  );
}

export function ResearchPapersLearnView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATS);
  const [year, setYear] = useState<string>(ALL_YEARS);
  const [sort, setSort] = useState<Sort>("Most Relevant");
  const [chip, setChip] = useState<string>("All");

  const filtering = query.trim() !== "" || category !== ALL_CATS || year !== ALL_YEARS || chip !== "All";

  const matchesChip = (p: Paper): boolean => {
    if (chip === "All") return true;
    if (chip === "Foundations") return p.tag === "Foundation";
    return p.category === chip;
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = PAPERS.filter(
      (p) =>
        matchesChip(p) &&
        (category === ALL_CATS || p.category === category) &&
        (year === ALL_YEARS || String(p.year) === year) &&
        (q === "" ||
          p.title.toLowerCase().includes(q) ||
          p.authors.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)),
    );
    const copy = [...list];
    switch (sort) {
      case "Most Cited":
        return copy.sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0));
      case "Newest":
        return copy.sort((a, b) => b.year - a.year);
      case "Oldest":
        return copy.sort((a, b) => a.year - b.year);
      default:
        return copy;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, year, sort, chip]);

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Research Papers</h1>
          <span className={styles.totalBadge}>{PAPER_TOTAL} Papers</span>
        </div>
        <p className={styles.subtitle}>Explore landmark research papers that shaped AI. Filter by topic, year or significance.</p>
      </header>

      <div className={styles.toolbar}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search papers by title, author, keyword…" />
        <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className={styles.select} value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          {SORTS.map((s) => (
            <option key={s} value={s}>Sort: {s}</option>
          ))}
        </select>
      </div>

      <div className={styles.chips}>
        {PAPER_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={f === chip ? styles.chipActive : styles.chip}
            onClick={() => setChip(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          {filtering ? (
            <section>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Results</h2>
                <span className={styles.resultCount}>{results.length} papers</span>
              </div>
              {results.length === 0 ? (
                <EmptyState title="No papers found" message="Try a different keyword, category or year." />
              ) : (
                <div className={styles.resultGrid}>
                  {results.map((p) => (
                    <PaperCard key={p.id} paper={p} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              <section>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>Foundation Papers</h2>
                  <p className={styles.sectionSub}>The most influential papers that built the foundation of modern AI.</p>
                </div>
                <div className={styles.row}>
                  {FOUNDATION.map((p) => (
                    <div key={p.id} className={styles.rowItem}>
                      <PaperCard paper={p} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>Recent Breakthroughs</h2>
                  <p className={styles.sectionSub}>Latest impactful research pushing the boundaries of AI.</p>
                </div>
                <div className={styles.row}>
                  {RECENT.map((p) => (
                    <div key={p.id} className={styles.rowItem}>
                      <PaperCard paper={p} />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>Browse by Category</h2>
                </div>
                <div className={styles.catGrid}>
                  {PAPER_CATEGORY_CARDS.map((c) => (
                    <button
                      key={c.category}
                      type="button"
                      className={styles.catCard}
                      onClick={() => setCategory(c.category)}
                    >
                      <IconBadge tone={c.tone}>
                        <TopicGlyph topic={c.category} />
                      </IconBadge>
                      <span className={styles.catName}>{c.category}</span>
                      <span className={styles.catCount}>{c.count} papers</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <aside className={styles.rail}>
          {FEATURED && (
            <div className={styles.featured}>
              <span className={styles.featuredTag}>Most Influential</span>
              <h3 className={styles.featuredTitle}>{FEATURED.title}</h3>
              <p className={styles.featuredMeta}>
                {FEATURED.authors} · {FEATURED.year}
              </p>
              <p className={styles.featuredSummary}>{FEATURED.summary}</p>
              <p className={styles.featuredCitations}>
                {FEATURED.citations?.toLocaleString()} citations
              </p>
              {FEATURED.href && (
                <a href={FEATURED.href} target="_blank" rel="noreferrer" className={styles.featuredLink}>
                  View full details →
                </a>
              )}
            </div>
          )}

          <div className={styles.railCard}>
            <h3 className={styles.railTitle}>Most Cited Papers</h3>
            <ol className={styles.cited}>
              {MOST_CITED.map((p, i) => (
                <li key={p.id} className={styles.citedItem}>
                  <span className={styles.citedRank}>{i + 1}</span>
                  <span className={styles.citedText}>
                    <a href={p.href} target="_blank" rel="noreferrer" className={styles.citedTitle}>
                      {p.title}
                    </a>
                    <span className={styles.citedMeta}>
                      {p.authors}, {p.year}
                    </span>
                  </span>
                  <span className={styles.citedCount}>{p.citations?.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.railCard}>
            <h3 className={styles.railTitle}>Trending Topics</h3>
            <ul className={styles.trending}>
              {PAPER_TRENDING_TOPICS.map((t) => (
                <li key={t.topic} className={styles.trendItem}>
                  <span className={styles.trendUp} aria-hidden="true">↗</span>
                  <span className={styles.trendTopic}>{t.topic}</span>
                  <span className={styles.trendCount}>{t.count} papers</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PdfGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <polyline points="14 3 14 8 19 8" />
    </svg>
  );
}
