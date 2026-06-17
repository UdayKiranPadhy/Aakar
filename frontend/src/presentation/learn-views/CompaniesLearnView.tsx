/**
 * AI Companies — the labs building today's frontier models. Static content.
 */

import { clsx } from "clsx";

import { COMPANIES } from "../learn/content/companies";
import { PageHeader, toneClass } from "../learn/primitives";
import styles from "./sections.module.css";

export function CompaniesLearnView() {
  return (
    <div className={styles.view}>
      <PageHeader
        title="AI Companies"
        subtitle="The organisations and labs building the frontier models, tools and research that define modern AI."
      />
      <div className={styles.grid}>
        {COMPANIES.map((c) => (
          <article key={c.id} className={styles.infoCard}>
            <div className={styles.cardHead}>
              <span className={clsx(styles.avatar, toneClass(c.tone))}>{c.name.charAt(0)}</span>
              <div className={styles.headText}>
                <h2 className={styles.cardTitle}>{c.name}</h2>
                <span className={styles.cardEyebrow}>Founded {c.founded}</span>
              </div>
            </div>
            <p className={styles.cardText}>{c.focus}</p>
            <div className={styles.footRow}>
              <span className={styles.kv}>
                <span className={styles.kvLabel}>Key models</span>
                <span className={styles.kvValue}>{c.keyModels}</span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
