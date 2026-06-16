/**
 * Small presentational parts shared across the Compare sections, so the two
 * model columns read as one family. Logic-free; styling via tokens.
 */

import type { ReactNode } from "react";
import { clsx } from "clsx";

import styles from "./primitives.module.css";

export type Tone = "a" | "b";

/** A titled, anchorable section. The id is the scroll target for the sub-nav. */
export function CompareSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

/** Two equal columns that collapse to one on narrow widths. */
export function DualColumns({ children }: { children: ReactNode }) {
  return <div className={styles.dual}>{children}</div>;
}

/** A bordered model card; the top border is tinted per column (A accent, B green). */
export function ModelCard({
  title,
  tone,
  subtitle,
  children,
}: {
  title: string | null;
  tone: Tone;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={clsx(styles.card, tone === "a" ? styles.toneA : styles.toneB)}>
      <header className={styles.cardHead}>
        <span className={styles.cardTitle} title={title ?? undefined}>
          {title ?? "No model loaded"}
        </span>
        {subtitle && <span className={styles.cardSubtitle}>{subtitle}</span>}
      </header>
      {children}
    </section>
  );
}

export type Fact = Readonly<{ label: string; value: ReactNode }>;

/** A definition list of label → value rows. */
export function Facts({ rows }: { rows: ReadonlyArray<Fact> }) {
  return (
    <dl className={styles.facts}>
      {rows.map((row) => (
        <div key={row.label} className={styles.factRow}>
          <dt className={styles.factLabel}>{row.label}</dt>
          <dd className={styles.factValue}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A headline stat (label + large mono value). */
export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={clsx(styles.statValue, accent && styles.statAccent)}>{value}</span>
    </div>
  );
}
