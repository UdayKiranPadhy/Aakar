/**
 * Blogs & Articles — curated reads, filterable by a simple search. Placeholder
 * content illustrating the section's intended look. Static.
 */

import { useMemo, useState } from "react";

import { BLOGS } from "../learn/content/blogs";
import { TopicGlyph } from "../learn/LearnGlyphs";
import { EmptyState, IconBadge, PageHeader, SearchInput, Tag } from "../learn/primitives";
import styles from "./sections.module.css";

export function BlogsLearnView() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOGS;
    return BLOGS.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.summary.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <div className={styles.view}>
      <PageHeader
        title="Blogs & Articles"
        subtitle="Curated reads from top AI researchers and engineers — explainers, deep dives and field notes."
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Search articles…" />}
      />
      {filtered.length === 0 ? (
        <EmptyState title="No articles found" message="Try a different search term." />
      ) : (
        <div className={styles.gridWide}>
          {filtered.map((b) => (
            <article key={b.id} className={styles.infoCard}>
              <div className={styles.cardHead}>
                <IconBadge tone={b.accent} size="lg">
                  <TopicGlyph topic={b.tags.join(" ")} />
                </IconBadge>
                <div className={styles.headText}>
                  <h2 className={styles.cardTitle}>{b.title}</h2>
                  <span className={styles.cardEyebrow}>
                    {b.org ?? b.author} · {b.date} · {b.readMinutes} min read
                  </span>
                </div>
              </div>
              <p className={styles.cardText}>{b.summary}</p>
              <div className={styles.tags}>
                {b.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
