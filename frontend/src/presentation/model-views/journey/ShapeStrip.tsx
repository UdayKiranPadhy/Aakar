/**
 * Live "token shape now" readout — the centerpiece of the journey. Shows the
 * focused stage's tensor shape as dimension chips (with the slider's concrete
 * B / S substituted), flashes the axis that changed from the previous stage, and
 * draws a log-scale feature-dimension bar so the embedding/LM-head growth is visible.
 */

import { clsx } from "clsx";

import styles from "./JourneyView.module.css";

const DIM_NAMES = ["batch", "seq", "feature"];

function parseDims(shape: string | null): string[] {
  if (!shape) return [];
  const inner = shape.replace(/[[\]]/g, "").trim();
  return inner ? inner.split(",").map((d) => d.trim()).filter(Boolean) : [];
}

export function ShapeStrip({
  shape,
  prevShape,
  batch,
  seq,
}: {
  shape: string | null;
  prevShape: string | null;
  batch: number;
  seq: number;
}) {
  const dims = parseDims(shape);
  const prev = parseDims(prevShape);
  const featRaw = dims.length > 2 ? Number(String(dims[2]).replace(/[^0-9]/g, "")) : 0;
  const feat = Number.isFinite(featRaw) ? featRaw : 0;
  const pct = feat > 0 ? Math.max(4, Math.min(100, (Math.log10(feat) / Math.log10(200000)) * 100)) : 4;
  const subst = (v: string) => (v === "B" ? String(batch) : v === "S" ? String(seq) : v);

  return (
    <div className={styles.strip}>
      <span className={styles.stripLabel}>Token shape</span>
      <div className={styles.dims}>
        {dims.length === 0 && <span className={styles.dimMuted}>—</span>}
        {dims.map((v, i) => (
          <span key={`${i}-${v}`} className={styles.dimWrap}>
            {i > 0 && <span className={styles.dimSep}>×</span>}
            <span className={clsx(styles.dim, (i >= prev.length || prev[i] !== v) && styles.dimFlash)}>
              <span className={styles.dimValue}>{subst(v)}</span>
              <span className={styles.dimName}>{DIM_NAMES[i] ?? `dim${i}`}</span>
            </span>
          </span>
        ))}
      </div>
      <div className={styles.featWrap}>
        <div className={styles.featCap}>feature dim (log) · {feat > 0 ? feat.toLocaleString() : "—"}</div>
        <div className={styles.featBar}>
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
