/**
 * A transparent, uncurated dump of every attribute the backend captured for a
 * module (`node.params`), titled with the real class name so it's clear these are
 * the class's own attributes. Collapsed by default — the concept panels show the
 * teaching-relevant facts above; this is the "show me everything" view beneath.
 */

import type { Node } from "../../domain/spec";
import { FieldRow, Section } from "./DetailSection";
import styles from "./GenericDetailPanel.module.css";

export function ModuleAttributesSection({ node }: { node: Node }) {
  const entries = Object.entries(node.params);
  if (entries.length === 0) return null;
  const title = node.module_class ? `${node.module_class} attributes` : "Attributes";
  return (
    <Section title={title} collapsible defaultOpen={false}>
      <dl className={styles.kvGrid}>
        {entries.map(([key, value]) => (
          <FieldRow key={key} k={key} field={key} v={String(value)} />
        ))}
      </dl>
    </Section>
  );
}
