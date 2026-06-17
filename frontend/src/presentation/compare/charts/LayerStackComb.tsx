/**
 * The vertical "comb" of repeated decoder layers from the Architecture mock: N
 * evenly-spaced ticks representing the layer stack. The glyph count is capped
 * for very deep models, but the label always shows the REAL count (never a
 * fabricated number). Renders nothing when the count is unknown.
 */

import { clsx } from "clsx";

import styles from "./LayerStackComb.module.css";

export type LayerStackCombProps = Readonly<{
  count: number;
  label?: string;
  /** Cap on rendered ticks; the true count still drives the label. */
  maxTicks?: number;
  tone?: "a" | "b";
  sublabel?: string;
}>;

export function LayerStackComb({ count, label, maxTicks = 48, tone = "a", sublabel }: LayerStackCombProps) {
  if (!Number.isFinite(count) || count <= 0) return null;
  const ticks = Math.min(Math.round(count), maxTicks);
  const items = Array.from({ length: ticks }, (_, i) => i);

  return (
    <div className={styles.comb}>
      <div
        className={clsx(styles.ticks, tone === "b" && styles.toneB)}
        role="img"
        aria-label={label ?? `${count} layers`}
      >
        {items.map((i) => (
          <span key={i} className={styles.tick} />
        ))}
      </div>
      <div className={styles.caption}>
        <span className={styles.count}>{label ?? `${count.toLocaleString()} layers`}</span>
        {sublabel && (
          <span className={styles.sub} title={sublabel}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
