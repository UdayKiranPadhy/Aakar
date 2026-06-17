/**
 * Datasets — the large-scale corpora models are trained on. Sizes are
 * approximate public figures. Static content.
 */

import { DATASETS } from "../learn/content/datasets";
import { TopicGlyph } from "../learn/LearnGlyphs";
import { CategoryChip, IconBadge, PageHeader } from "../learn/primitives";
import styles from "./sections.module.css";

export function DatasetsLearnView() {
  return (
    <div className={styles.view}>
      <PageHeader
        title="Datasets"
        subtitle="The large-scale corpora — web text, images and image–text pairs — that modern models learn from."
      />
      <div className={styles.grid}>
        {DATASETS.map((d) => (
          <article key={d.id} className={styles.infoCard}>
            <div className={styles.cardHead}>
              <IconBadge tone={d.tone}>
                <TopicGlyph topic={d.modality} />
              </IconBadge>
              <div className={styles.headText}>
                <h2 className={styles.cardTitle}>{d.name}</h2>
                <span className={styles.cardEyebrow}>{d.size}</span>
              </div>
            </div>
            <div className={styles.tags}>
              <CategoryChip category={d.modality} tone={d.tone} />
            </div>
            <p className={styles.cardText}>{d.description}</p>
            <div className={styles.footRow}>
              <span className={styles.kv}>
                <span className={styles.kvLabel}>Used by</span>
                <span className={styles.kvValue}>{d.usedBy}</span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
