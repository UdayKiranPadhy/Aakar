/**
 * Dual-series (A vs B) horizontal bars on a shared scale — the side-by-side
 * counterpart to the single-series `ProportionalBar`. Each row compares one
 * category across the two models; a series with no value renders an empty track
 * (graceful when a model lacks that component). Pure + prop-driven, token-themed.
 */

import { clsx } from "clsx";

import { SERIES_A, SERIES_B } from "./palette";
import styles from "./GroupedBars.module.css";

export type GroupedBarRow = Readonly<{
  label: string;
  a?: number;
  b?: number;
  aText?: string;
  bText?: string;
  sublabel?: string;
}>;

export type GroupedBarsProps = Readonly<{
  rows: ReadonlyArray<GroupedBarRow>;
  /** Shared scale; defaults to the max value across all rows/series. */
  max?: number;
  seriesALabel?: string;
  seriesBLabel?: string;
  formatValue?: (v: number) => string;
}>;

export function GroupedBars({ rows, max, seriesALabel, seriesBLabel, formatValue }: GroupedBarsProps) {
  const visible = rows.filter((r) => typeof r.a === "number" || typeof r.b === "number");
  if (visible.length === 0) return null;

  const fmt = formatValue ?? ((v: number) => v.toLocaleString());
  const computedMax = max ?? visible.reduce((m, r) => Math.max(m, r.a ?? 0, r.b ?? 0), 0);
  // Floor a non-zero bar at 2% so it stays visible (matches ProportionalBar).
  const width = (v: number | undefined) =>
    typeof v === "number" && computedMax > 0 ? `${Math.max(2, (v / computedMax) * 100)}%` : "0%";

  return (
    <div className={styles.chart}>
      {(seriesALabel || seriesBLabel) && (
        <div className={styles.legend}>
          {seriesALabel && (
            <span className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: SERIES_A }} />
              <span className={styles.legendText} title={seriesALabel}>
                {seriesALabel}
              </span>
            </span>
          )}
          {seriesBLabel && (
            <span className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: SERIES_B }} />
              <span className={styles.legendText} title={seriesBLabel}>
                {seriesBLabel}
              </span>
            </span>
          )}
        </div>
      )}
      <ul className={styles.rows}>
        {visible.map((r) => (
          <li key={r.label} className={styles.row}>
            <div className={styles.rowHead}>
              <span className={styles.rowLabel} title={r.label}>
                {r.label}
              </span>
              {r.sublabel && <span className={styles.rowSub}>{r.sublabel}</span>}
            </div>
            <div className={styles.series}>
              <span className={styles.track}>
                <span className={clsx(styles.fill, styles.fillA)} style={{ width: width(r.a) }} />
              </span>
              <span className={styles.value}>{r.aText ?? (typeof r.a === "number" ? fmt(r.a) : "—")}</span>
            </div>
            <div className={styles.series}>
              <span className={styles.track}>
                <span className={clsx(styles.fill, styles.fillB)} style={{ width: width(r.b) }} />
              </span>
              <span className={styles.value}>{r.bText ?? (typeof r.b === "number" ? fmt(r.b) : "—")}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
