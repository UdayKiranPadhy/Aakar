/** Hyperparameter diff — the headline metrics lined up, differing rows tinted. */

import { clsx } from "clsx";

import type { Spec } from "../../../domain/spec";
import { ViewEmpty } from "../../model-views/shared/primitives";
import { specDiffRows } from "../helpers/specDiff";
import { CompareSection } from "../primitives";
import styles from "./SpecDiffSection.module.css";

export function SpecDiffSection({ a, b }: { a: Spec | null; b: Spec | null }) {
  const rows = specDiffRows(a, b);

  return (
    <CompareSection id="specs" title="Hyperparameters">
      {rows.length === 0 ? (
        <ViewEmpty message="Load a model to compare hyperparameters." />
      ) : (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.metricHead}>
                  Metric
                </th>
                <th scope="col" className={styles.colHead} title={a?.model_id}>
                  {a?.model_id ?? "Model A"}
                </th>
                <th scope="col" className={styles.colHead} title={b?.model_id}>
                  {b?.model_id ?? "Model B"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className={clsx(row.differs && styles.differ)}>
                  <th scope="row" className={styles.metric}>
                    {row.label}
                  </th>
                  <td className={styles.value}>{row.a}</td>
                  <td className={styles.value}>{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CompareSection>
  );
}
