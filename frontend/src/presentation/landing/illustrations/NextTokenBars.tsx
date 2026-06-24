/**
 * Next-token prediction — candidate tokens and their probability scores, the
 * thing an LLM actually outputs. Rounded-top bars in bold Google colours over a
 * baseline; the winning token's bar is the tallest and its label is emphasised.
 * Static; colours via the `style` prop (CSS custom properties don't resolve in
 * SVG presentation attributes — see colors.ts).
 */

import * as c from "./colors";
import styles from "./illustrations.module.css";

type Bar = { x: number; h: number; color: string; label: string; peak?: boolean };

const BASE = 150;
const BW = 28;

const BARS: readonly Bar[] = [
  { x: 34, h: 50, color: c.blue, label: "the" },
  { x: 76, h: 108, color: c.green, label: "cat", peak: true },
  { x: 118, h: 68, color: c.red, label: "sat" },
  { x: 160, h: 42, color: c.yellow, label: "on" },
  { x: 202, h: 30, color: c.blueStrong, label: "a" },
];

/** Rect with rounded top corners and a flat bottom sitting on the baseline. */
function barPath(x: number, w: number, h: number, radius: number) {
  const top = BASE - h;
  const r = Math.min(radius, h / 2, w / 2);
  return `M${x},${BASE} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${BASE} Z`;
}

export function NextTokenBars() {
  return (
    <div className={styles.artCard}>
      <svg
        className={styles.svg}
        viewBox="0 0 240 180"
        role="img"
        aria-label="A next-token probability distribution over candidate tokens"
      >
        {/* Axes. */}
        <line x1={20} y1={24} x2={20} y2={BASE} style={{ stroke: c.inkSubtle }} strokeWidth={2} opacity={0.4} />
        <line x1={20} y1={BASE} x2={232} y2={BASE} style={{ stroke: c.inkSubtle }} strokeWidth={2} opacity={0.4} />

        {BARS.map((b) => (
          <g key={b.label}>
            <path d={barPath(b.x, BW, b.h, 8)} style={{ fill: b.color }} />
            <text
              x={b.x + BW / 2}
              y={BASE - b.h - 9}
              textAnchor="middle"
              fontSize={b.peak ? 13 : 12}
              fontWeight={b.peak ? 700 : 500}
              style={{ fill: b.peak ? b.color : c.inkMuted }}
            >
              {b.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
