/**
 * A single donut/ring chart drawn from proportional slices, with a legend below
 * and an optional center label. Pure + prop-driven; colours come from tokens
 * (so it adapts in dark mode). The caller renders two of these side by side for
 * an A-vs-B comparison. Renders nothing when there's no positive data.
 */

import { categoricalColor } from "./palette";
import styles from "./DonutChart.module.css";

export type DonutSlice = Readonly<{
  id: string;
  label: string;
  value: number;
  /** Optional colour override; otherwise a token-backed categorical colour. */
  color?: string;
}>;

export type DonutChartProps = Readonly<{
  slices: ReadonlyArray<DonutSlice>;
  size?: number;
  thickness?: number;
  centerPrimary?: string;
  centerSecondary?: string;
  formatValue?: (v: number) => string;
  ariaLabel?: string;
}>;

export function DonutChart({
  slices,
  size = 168,
  thickness = 22,
  centerPrimary,
  centerSecondary,
  formatValue,
  ariaLabel,
}: DonutChartProps) {
  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;
  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  let offset = 0;
  const arcs = positive.map((slice, i) => {
    const frac = slice.value / total;
    const len = frac * circumference;
    const arc = { slice, color: slice.color ?? categoricalColor(i), len, offset, pct: frac * 100 };
    offset += len;
    return arc;
  });

  return (
    <div className={styles.donut}>
      <svg
        className={styles.svg}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel ?? "Distribution"}
      >
        <circle
          className={styles.trackRing}
          cx={center}
          cy={center}
          r={r}
          strokeWidth={thickness}
          fill="none"
        />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {arcs.map((a) => (
            <circle
              key={a.slice.id}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={thickness}
              strokeDasharray={`${a.len} ${circumference - a.len}`}
              strokeDashoffset={-a.offset}
            >
              <title>{`${a.slice.label}: ${fmt(a.slice.value)} (${a.pct.toFixed(1)}%)`}</title>
            </circle>
          ))}
        </g>
        {centerPrimary && (
          <text className={styles.centerPrimary} x={center} y={center - 2} textAnchor="middle" dominantBaseline="middle">
            {centerPrimary}
          </text>
        )}
        {centerSecondary && (
          <text className={styles.centerSecondary} x={center} y={center + 15} textAnchor="middle" dominantBaseline="middle">
            {centerSecondary}
          </text>
        )}
      </svg>
      <ul className={styles.legend}>
        {arcs.map((a) => (
          <li key={a.slice.id} className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: a.color }} />
            <span className={styles.legendLabel} title={a.slice.label}>
              {a.slice.label}
            </span>
            <span className={styles.legendValue}>
              {fmt(a.slice.value)} ({a.pct.toFixed(1)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
