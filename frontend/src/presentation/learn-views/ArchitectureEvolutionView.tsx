/**
 * Architecture Evolution — how each generation of neural-network architecture
 * built on and addressed the limits of the last. Static content card grid.
 */

import { ARCHITECTURE_ERAS } from "../learn/content/architectures";
import { TopicGlyph } from "../learn/LearnGlyphs";
import { IconBadge, PageHeader, Tag } from "../learn/primitives";
import styles from "./sections.module.css";

export function ArchitectureEvolutionView() {
  return (
    <div className={styles.view}>
      <PageHeader
        title="Architecture Evolution"
        subtitle="How neural-network architectures built on — and addressed the limits of — the generation before."
      />
      <div className={styles.gridWide}>
        {ARCHITECTURE_ERAS.map((a) => (
          <article key={a.id} className={styles.infoCard}>
            <div className={styles.cardHead}>
              <IconBadge tone={a.tone}>
                <TopicGlyph topic={`${a.name} ${a.tagline}`} />
              </IconBadge>
              <div className={styles.headText}>
                <span className={styles.cardEyebrow}>{a.era}</span>
                <h2 className={styles.cardTitle}>{a.name}</h2>
                <span className={styles.cardTagline}>{a.tagline}</span>
              </div>
            </div>
            <p className={styles.cardText}>{a.description}</p>
            <span className={styles.kicker}>Key ideas</span>
            <div className={styles.tags}>
              {a.keyIdeas.map((k) => (
                <Tag key={k}>{k}</Tag>
              ))}
            </div>
            <div className={styles.footRow}>
              <span className={styles.kv}>
                <span className={styles.kvLabel}>Examples</span>
                <span className={styles.kvValue}>{a.examples}</span>
              </span>
              <span className={styles.kv}>
                <span className={styles.kvLabel}>Improves on</span>
                <span className={styles.kvValue}>{a.supersedes}</span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
