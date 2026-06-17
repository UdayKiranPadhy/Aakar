/**
 * Benchmarks — the evaluations used to measure model capability. Top-score
 * figures are illustrative placeholders. Static content.
 */

import { BENCHMARKS } from "../learn/content/benchmarks";
import { TopicGlyph } from "../learn/LearnGlyphs";
import { CategoryChip, IconBadge, PageHeader } from "../learn/primitives";
import styles from "./sections.module.css";

export function BenchmarksLearnView() {
  return (
    <div className={styles.view}>
      <PageHeader
        title="Benchmarks"
        subtitle="The standard evaluations researchers use to measure and compare what models can do."
      />
      <div className={styles.grid}>
        {BENCHMARKS.map((b) => (
          <article key={b.id} className={styles.infoCard}>
            <div className={styles.cardHead}>
              <IconBadge tone={b.tone}>
                <TopicGlyph topic={b.domain} />
              </IconBadge>
              <div className={styles.headText}>
                <h2 className={styles.cardTitle}>{b.name}</h2>
                <span className={styles.cardTagline}>{b.fullName}</span>
              </div>
            </div>
            <div className={styles.tags}>
              <CategoryChip category={b.domain} tone={b.tone} />
            </div>
            <p className={styles.cardText}>{b.description}</p>
            <div className={styles.footRow}>
              <span className={styles.kv}>
                <span className={styles.kvLabel}>Measures</span>
                <span className={styles.kvValue}>{b.metric}</span>
              </span>
              <span className={styles.kv}>
                <span className={styles.kvLabel}>Top score</span>
                <span className={styles.kvValue}>{b.topScore}</span>
              </span>
              <span className={styles.kv}>
                <span className={styles.kvLabel}>Leaders</span>
                <span className={styles.kvValue}>{b.topModel}</span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
