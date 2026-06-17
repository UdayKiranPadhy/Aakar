/**
 * Total-parameters on a base-10 log axis (the "Model Scale" visual): one marker
 * per model on a shared logarithmic axis, so the order-of-magnitude gap is the
 * story. Pure + prop-driven; positioning math lives in `logScale.ts`. Renders
 * nothing when no model has a positive value.
 */

import { clsx } from "clsx";

import { formatParamCount } from "../../components/ui/format";
import { defaultLogTicks, logPosition } from "./logScale";
import styles from "./LogScaleBar.module.css";

export type LogScaleItem = Readonly<{
  id: string;
  label: string;
  value: number;
  valueText?: string;
  tone?: "a" | "b";
}>;

export type LogScaleBarProps = Readonly<{
  items: ReadonlyArray<LogScaleItem>;
  min?: number;
  max?: number;
  ticks?: ReadonlyArray<number>;
  formatTick?: (v: number) => string;
}>;

export function LogScaleBar({ items, min, max, ticks, formatTick }: LogScaleBarProps) {
  const positive = items.filter((it) => it.value > 0);
  if (positive.length === 0) return null;

  const largest = Math.max(...positive.map((it) => it.value));
  const smallest = Math.min(...positive.map((it) => it.value));
  const axisMin = min ?? 10 ** Math.floor(Math.log10(smallest));
  const axisMax = max ?? 10 ** Math.ceil(Math.log10(largest));
  const tickValues = ticks ?? defaultLogTicks(axisMin, axisMax);
  const fmtTick = formatTick ?? formatParamCount;

  return (
    <div className={styles.scale}>
      <div className={styles.axis}>
        {tickValues.map((t) => (
          <span key={t} className={styles.tick} style={{ left: `${logPosition(t, axisMin, axisMax) * 100}%` }}>
            <span className={styles.tickLine} />
            <span className={styles.tickLabel}>{fmtTick(t)}</span>
          </span>
        ))}
        {positive.map((it) => (
          <span
            key={it.id}
            className={clsx(styles.marker, it.tone === "b" && styles.markerB)}
            style={{ left: `${logPosition(it.value, axisMin, axisMax) * 100}%` }}
            title={`${it.label}: ${it.valueText ?? formatParamCount(it.value)}`}
          />
        ))}
      </div>
      <ul className={styles.legend}>
        {positive.map((it) => (
          <li key={it.id} className={styles.legendItem}>
            <span className={clsx(styles.dot, it.tone === "b" && styles.markerB)} />
            <span className={styles.legendLabel} title={it.label}>
              {it.label}
            </span>
            <span className={styles.legendValue}>{it.valueText ?? formatParamCount(it.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
