/**
 * Compare view — two models side by side. Column A is the loaded model
 * (`spec`); column B is loaded into `compareSpec` via a search here (without
 * leaving Compare). Differing rows are highlighted.
 */

import { useState } from "react";
import { clsx } from "clsx";

import { useCompareModel } from "../../application/useCompareModel";
import { useArchStore } from "../../store/archStore";
import { PlaceholderScreen } from "../components/PlaceholderScreen";
import { specMetrics } from "./specMetrics";
import styles from "./CompareHost.module.css";

export function CompareHost() {
  const specA = useArchStore((s) => s.spec);
  const specB = useArchStore((s) => s.compareSpec);
  const { load, loading, error } = useCompareModel();
  const [query, setQuery] = useState("");

  if (!specA) {
    return (
      <PlaceholderScreen
        title="Compare models"
        message="Load a model from the search bar above, then compare it against another one here."
      />
    );
  }

  const metricsA = specMetrics(specA);
  const metricsB = specB ? specMetrics(specB) : null;

  return (
    <div className={styles.root}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.corner} />
            <th className={styles.colHead} title={specA.model_id}>
              {specA.model_id}
            </th>
            <th className={styles.colHead}>
              <form
                className={styles.searchForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  load(query);
                }}
              >
                <input
                  type="text"
                  className={styles.search}
                  placeholder="Compare with… (model id)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Second model id"
                  disabled={loading}
                />
              </form>
              {specB && <span className={styles.bId} title={specB.model_id}>{specB.model_id}</span>}
              {error && <span className={styles.error}>{error}</span>}
            </th>
          </tr>
        </thead>
        <tbody>
          {metricsA.map((m, i) => {
            const bMetric = metricsB?.[i];
            const bValue = bMetric ? bMetric.value : loading ? "…" : "—";
            const differ = bMetric != null && bMetric.value !== m.value;
            return (
              <tr key={m.label} className={clsx(differ && styles.differ)}>
                <th scope="row" className={styles.metric}>
                  {m.label}
                </th>
                <td className={styles.value}>{m.value}</td>
                <td className={styles.value}>{bValue}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
