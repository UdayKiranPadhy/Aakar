/**
 * A lens.google-style scalloped "seal" badge: a flower/cog rounded-scallop disc
 * in a solid accent colour with a white concept glyph centred on it — the vivid
 * foreground accent that overhangs a feature section's diagram (paired with the
 * soft pastel background shapes). Purely decorative.
 *
 * The disc is generated, not hand-drawn: N points on a circle, each adjacent
 * pair joined by an outward-bulging semicircle → a rounded "flower/seal" edge.
 * Colour is applied via the `style` prop (CSS custom properties don't resolve
 * inside SVG presentation attributes — same constraint as colors.ts).
 */

import { type ReactNode } from "react";

import styles from "./illustrations.module.css";

function scallopPath(cx: number, cy: number, r: number, bumps: number): string {
  const pts = Array.from({ length: bumps }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / bumps;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });
  const rr = r * Math.sin(Math.PI / bumps); // semicircle radius = half the chord
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i <= bumps; i++) {
    const [x, y] = pts[i % bumps];
    d += ` A ${rr.toFixed(2)} ${rr.toFixed(2)} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d} Z`;
}

const SCALLOP = scallopPath(50, 50, 38, 12);

type Props = { color: string; size?: number; children: ReactNode };

export function SealBadge({ color, size = 88, children }: Props) {
  return (
    <span className={styles.sealWrap} style={{ width: size, height: size }} aria-hidden="true">
      <svg className={styles.sealDisc} viewBox="0 0 100 100">
        <path d={SCALLOP} style={{ fill: color }} />
      </svg>
      <span className={styles.sealIcon}>{children}</span>
    </span>
  );
}
