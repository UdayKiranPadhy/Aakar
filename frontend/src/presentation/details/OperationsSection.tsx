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
import { useArchStore } from "../../store/archStore";
import { opCategoryTone } from "../components/ui/opCategoryTone";
import styles from "./OperationsSection.module.css";

export function OperationsSection({
  operations,
}: {
  operations?: ReadonlyArray<Operation>;
}) {
  const selectionPath = useArchStore((s) => s.selectionPath);
  const opFlowPath = useArchStore((s) => s.opFlowPath);
  const enterOpFlow = useArchStore((s) => s.enterOpFlow);
  const exitOpFlow = useArchStore((s) => s.exitOpFlow);

  if (!operations || operations.length === 0) return null;

  // These ops belong to the selected module, so its full path is `selectionPath`.
  const active =
    opFlowPath != null &&
    selectionPath.length > 0 &&
    opFlowPath.join("/") === selectionPath.join("/");

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          Forward operations <span className={styles.count}>· {operations.length}</span>
        </h3>
        {selectionPath.length > 0 && (
          <button
            type="button"
            className={styles.diagramBtn}
            aria-pressed={active}
            onClick={() => (active ? exitOpFlow() : enterOpFlow(selectionPath))}
          >
            {active ? "✓ On canvas" : "View on canvas ⚙"}
          </button>
        )}
      </div>
      <p className={styles.caption}>
        Every tensor op this module&apos;s <code>forward()</code> runs, in execution order
        — captured by a fake-tensor trace (no weights, no compute).
      </p>
      <ol className={styles.list}>
        {operations.map((op) => {
          const tone = opCategoryTone(op.category);
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
