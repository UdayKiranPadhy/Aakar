/**
 * Interactive Visualizations — hands-on tools to build intuition. The Learn
 * surface stays offline, so these are forward-looking entries with a status.
 */

import { clsx } from "clsx";

import { VIZ_TOOLS } from "../learn/content/visualizations";
import { TopicGlyph } from "../learn/LearnGlyphs";
import { IconBadge, PageHeader, Tag } from "../learn/primitives";
import styles from "./sections.module.css";

export function VisualizationsLearnView() {
  return (
    <div className={styles.view}>
      <PageHeader
        title="Interactive Visualizations"
        subtitle="Hands-on tools to build intuition by playing with the ideas directly, rather than only reading about them."
      />
      <div className={styles.grid}>
        {VIZ_TOOLS.map((v) => (
          <article key={v.id} className={styles.infoCard}>
            <div className={styles.cardHead}>
              <IconBadge tone={v.tone}>
                <TopicGlyph topic={v.concept} />
              </IconBadge>
              <div className={styles.headText}>
                <h2 className={styles.cardTitle}>{v.name}</h2>
                <span className={clsx(styles.status, v.status === "Live" ? styles.statusLive : styles.statusSoon)}>
                  {v.status}
                </span>
              </div>
            </div>
            <p className={styles.cardText}>{v.blurb}</p>
            <div className={styles.tags}>
              <Tag>{v.concept}</Tag>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
