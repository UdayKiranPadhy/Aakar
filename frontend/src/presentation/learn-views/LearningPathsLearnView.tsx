/**
 * Learning Paths — guided, multi-module curricula from beginner to advanced.
 * Progress is illustrative. Static content.
 */

import { clsx } from "clsx";

import { LEARNING_PATHS } from "../learn/content/paths";
import { TopicGlyph } from "../learn/LearnGlyphs";
import { CategoryChip, IconBadge, PageHeader, Tag, toneClass } from "../learn/primitives";
import styles from "./sections.module.css";

export function LearningPathsLearnView() {
  return (
    <div className={styles.view}>
      <PageHeader
        title="Learning Paths"
        subtitle="Step-by-step guides that take you from first principles to the cutting edge — at your own pace."
      />
      <div className={styles.col}>
        {LEARNING_PATHS.map((p) => (
          <article key={p.id} className={styles.pathCard}>
            <div className={styles.pathHead}>
              <IconBadge tone={p.tone} size="lg">
                <TopicGlyph topic={p.title} />
              </IconBadge>
              <div className={styles.pathHeadText}>
                <span className={styles.pathTitle}>
                  {p.title}
                  <CategoryChip category={p.level} tone={p.tone} />
                </span>
                <span className={styles.pathBlurb}>{p.blurb}</span>
              </div>
              <div className={styles.pathStats}>
                <span className={styles.pathStat}>
                  <span className={styles.pathStatVal}>{p.lessons}</span>
                  <span className={styles.pathStatLbl}>lessons</span>
                </span>
                <span className={styles.pathStat}>
                  <span className={styles.pathStatVal}>{p.estHours}h</span>
                  <span className={styles.pathStatLbl}>est. time</span>
                </span>
                <span className={styles.pathStat}>
                  <span className={styles.pathStatVal}>{p.progress}%</span>
                  <span className={styles.pathStatLbl}>complete</span>
                </span>
              </div>
            </div>
            <span className={styles.progressTrack}>
              <span className={clsx(styles.progressFill, toneClass(p.tone))} style={{ width: `${p.progress}%` }} />
            </span>
            <div className={styles.modules}>
              {p.modules.map((m) => (
                <div key={m.title} className={styles.module}>
                  <div className={styles.moduleHead}>
                    <span className={styles.moduleTitle}>{m.title}</span>
                    <span className={styles.moduleLessons}>{m.lessons} lessons</span>
                  </div>
                  <div className={styles.tags}>
                    {m.topics.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
