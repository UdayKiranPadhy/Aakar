/**
 * Small presentational primitives shared by the model-views, so they read as
 * one family. Logic-free; styling via the shared CSS module + tokens.
 */

import type { ReactNode } from "react";
import { clsx } from "clsx";

import { Spinner } from "../../components/ui/Spinner";
import styles from "./primitives.module.css";

export function ViewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

export function ViewLoading({ label }: { label: string }) {
  return (
    <div className={styles.state}>
      <Spinner />
      <span className={styles.stateText}>{label}</span>
    </div>
  );
}

export function ViewError({ message }: { message: string }) {
  return (
    <div className={clsx(styles.state, styles.error)} role="alert">
      {message}
    </div>
  );
}

export function ViewEmpty({ message }: { message: string }) {
  return (
    <div className={styles.state}>
      <span className={styles.stateText}>{message}</span>
    </div>
  );
}

export function ProportionalBar({
  label,
  sublabel,
  value,
  max,
}: {
  label: string;
  sublabel: string;
  value: number;
  max: number;
}) {
  // Floor at 2% so a non-zero-but-tiny component is still visible.
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className={styles.bar}>
      <div className={styles.barTopline}>
        <span className={styles.barLabel} title={label}>
          {label}
        </span>
        <span className={styles.barValue}>{sublabel}</span>
      </div>
      <span className={styles.barTrack}>
        <span className={styles.barFill} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
