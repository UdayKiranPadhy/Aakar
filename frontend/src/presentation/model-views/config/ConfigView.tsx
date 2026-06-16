/**
 * Config Explorer — renders the model's full config generically. EVERY key is
 * shown (grouped by heuristic + a catch-all), with a search filter. Falls back
 * to the curated `config_summary` if the backend hasn't sent `config_full`.
 */

import { useMemo, useState } from "react";

import type { ModelViewProps } from "../ModelViewRegistry";
import { ViewEmpty } from "../shared/primitives";
import shared from "../shared/primitives.module.css";
import { flattenConfig, formatConfigValue, groupConfig } from "./configGrouping";
import styles from "./ConfigView.module.css";

export function ConfigView({ spec }: ModelViewProps) {
  const [query, setQuery] = useState("");
  const source = (spec.config_full ?? spec.config_summary) as Record<string, unknown>;
  const leaves = useMemo(() => flattenConfig(source), [source]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q
        ? leaves.filter(
            (l) =>
              l.path.toLowerCase().includes(q) ||
              formatConfigValue(l.value).toLowerCase().includes(q),
          )
        : leaves,
    [leaves, q],
  );
  const groups = useMemo(() => groupConfig(filtered), [filtered]);

  if (leaves.length === 0) {
    return (
      <div className={shared.view}>
        <ViewEmpty message="No configuration available for this model." />
      </div>
    );
  }

  return (
    <div className={shared.view}>
      <input
        type="search"
        className={styles.search}
        placeholder="Filter config keys…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Filter config keys"
      />

      {filtered.length === 0 ? (
        <ViewEmpty message={`No keys match “${query}”.`} />
      ) : (
        groups.map((group) => (
          <section key={group.id} className={styles.group}>
            <h3 className={styles.groupTitle}>
              {group.label}
              <span className={styles.count}>{group.leaves.length}</span>
            </h3>
            <dl className={styles.kv}>
              {group.leaves.map((leaf) => (
                <div key={leaf.path} className={styles.row}>
                  <dt className={styles.key}>{leaf.path}</dt>
                  <dd className={styles.val}>{formatConfigValue(leaf.value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))
      )}
    </div>
  );
}
