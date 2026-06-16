/**
 * Lists the operations a module's `forward()` runs (from the backend's
 * fake-tensor trace). Rendered inside detail panels; hidden when the node has
 * no operations (leaf primitives the trace skipped, or an untraceable model).
 *
 * Categories map to the existing Google-palette tokens so colours stay
 * theme-consistent — no hardcoded hex values.
 */

import type { CSSProperties } from "react";

import type { Operation } from "../../domain/spec";
import styles from "./OperationsSection.module.css";

type Tone = { color: string; bg: string };

const NEUTRAL_TONE: Tone = { color: "var(--color-ink-subtle)", bg: "var(--color-canvas)" };

const CATEGORY_TONE: Record<string, Tone> = {
  matmul: { color: "var(--g-purple)", bg: "var(--g-purple-subtle)" },
  activation: { color: "var(--g-yellow-ink)", bg: "var(--g-yellow-subtle)" },
  norm: { color: "var(--g-green)", bg: "var(--g-green-subtle)" },
  elementwise: { color: "var(--g-blue-strong)", bg: "var(--g-blue-subtle)" },
  embedding: { color: "var(--g-red)", bg: "var(--g-red-subtle)" },
  attention: { color: "var(--g-purple)", bg: "var(--g-purple-subtle)" },
  shape: NEUTRAL_TONE,
  other: NEUTRAL_TONE,
};

export function OperationsSection({
  operations,
}: {
  operations?: ReadonlyArray<Operation>;
}) {
  if (!operations || operations.length === 0) return null;

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>
        Forward operations <span className={styles.count}>· {operations.length}</span>
      </h3>
      <p className={styles.caption}>
        Every tensor op this module&apos;s <code>forward()</code> runs, in execution order
        — captured by a fake-tensor trace (no weights, no compute).
      </p>
      <ol className={styles.list}>
        {operations.map((op) => {
          const tone = CATEGORY_TONE[op.category] ?? NEUTRAL_TONE;
          const vars = { "--cat": tone.color, "--cat-bg": tone.bg } as CSSProperties;
          return (
            <li key={op.id} className={styles.row} style={vars}>
              <span className={styles.bar} aria-hidden />
              <span className={styles.badge}>{op.category}</span>
              <span className={styles.main}>
                <span className={styles.label}>{op.label}</span>
                <span className={styles.op}>{op.op}</span>
              </span>
              {op.out_shape && <span className={styles.shape}>{op.out_shape}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
