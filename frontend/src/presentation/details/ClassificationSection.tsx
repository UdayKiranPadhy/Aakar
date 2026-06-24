/**
 * Classification section — surfaces the two semantic facts the backend derives
 * for a module that no other section shows: its `role` and its namespace
 * `category`. Both are inferred from facts (config dims, tensor shapes, the
 * Python namespace) rather than class names, so they generalize to any
 * architecture. Hidden when the node carries neither.
 */

import type { Node } from "../../domain/spec";
import { FieldRow, Section } from "./DetailSection";
import styles from "./GenericDetailPanel.module.css";

export function ClassificationSection({ node }: { node: Node }) {
  const rows: Array<[string, string]> = [];
  if (node.role) rows.push(["role", node.role]);
  if (node.category) rows.push(["category", node.category]);
  if (rows.length === 0) return null;

  return (
    <Section title="Classification">
      <dl className={styles.kvGrid}>
        {rows.map(([k, v]) => (
          <FieldRow key={k} k={k} v={v} />
        ))}
      </dl>
    </Section>
  );
}
