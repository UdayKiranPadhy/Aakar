/**
 * Generic config diff — flattens both models' full configs (every key) and
 * classifies the union. Search + "diffs only" keep large configs readable.
 */

import { useMemo, useState } from "react";
import { clsx } from "clsx";

import type { Spec } from "../../../domain/spec";
import { Button } from "../../components/ui/Button";
import { ViewEmpty } from "../../model-views/shared/primitives";
import { type ConfigDiffStatus, configDiff } from "../helpers/configDiff";
import { CompareSection } from "../primitives";
import styles from "./ConfigDiffSection.module.css";

const STATUS_TAG: Record<ConfigDiffStatus, string> = {
  same: "",
  changed: "changed",
  added: "added",
  removed: "removed",
};

export function ConfigDiffSection({ a, b }: { a: Spec | null; b: Spec | null }) {
  const [query, setQuery] = useState("");
  const [diffsOnly, setDiffsOnly] = useState(false);

  const rows = useMemo(() => configDiff(a, b), [a, b]);
  const changes = useMemo(() => rows.filter((r) => r.status !== "same").length, [rows]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (diffsOnly && r.status === "same") return false;
        if (!q) return true;
        return (
          r.path.toLowerCase().includes(q) ||
          (r.a ?? "").toLowerCase().includes(q) ||
          (r.b ?? "").toLowerCase().includes(q)
        );
      }),
    [rows, q, diffsOnly],
  );

  return (
    <CompareSection id="config" title="Config diff">
      {rows.length === 0 ? (
        <ViewEmpty message="Load a model to compare configurations." />
      ) : (
        <>
          <div className={styles.controls}>
            <input
              type="search"
              className={styles.search}
              placeholder="Filter keys or values…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter config keys"
            />
            <Button
              variant={diffsOnly ? "primary" : "secondary"}
              size="sm"
              onClick={() => setDiffsOnly((v) => !v)}
              aria-pressed={diffsOnly}
            >
              Diffs only · {changes}
            </Button>
          </div>

          <div className={styles.list}>
            <div className={clsx(styles.row, styles.header)}>
              <span className={styles.cellKey}>Key</span>
              <span className={styles.cell} title={a?.model_id}>
                {a?.model_id ?? "Model A"}
              </span>
              <span className={styles.cell} title={b?.model_id}>
                {b?.model_id ?? "Model B"}
              </span>
            </div>
            {filtered.length === 0 ? (
              <div className={styles.emptyRow}>No keys match.</div>
            ) : (
              filtered.map((r) => (
                <div key={r.path} className={clsx(styles.row, styles[r.status])}>
                  <span className={styles.cellKey} title={r.path}>
                    {r.status !== "same" && (
                      <span className={clsx(styles.tag, styles[`tag_${r.status}`])}>
                        {STATUS_TAG[r.status]}
                      </span>
                    )}
                    {r.path}
                  </span>
                  <span className={styles.cell} title={r.a ?? undefined}>
                    {r.a ?? "—"}
                  </span>
                  <span className={styles.cell} title={r.b ?? undefined}>
                    {r.b ?? "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </CompareSection>
  );
}
