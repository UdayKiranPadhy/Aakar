/**
 * Shared detail-panel primitives: a titled `Section` and a key/value `FieldRow`.
 *
 * `FieldRow` wraps its key label in a `Tooltip` whenever the field glossary
 * knows it, so every documented field explains itself on hover / focus. Pass an
 * explicit `field` when the visible label differs from the canonical field name
 * (e.g. "Input Features (in_features)" → `field="in_features"`).
 *
 * These live in one place so `GenericDetailPanel` and the custom panels
 * (Linear, Embedding, …) render identical rows and inherit tooltips for free.
 */

import { useId, useState, type ReactNode } from "react";
import { clsx } from "clsx";

import { Tooltip } from "../components/ui/Tooltip";
import { fieldTip } from "./fieldGlossary";
import styles from "./GenericDetailPanel.module.css";

/**
 * Titled detail section. Pass `collapsible` to make the header a disclosure
 * button (defaulting to `defaultOpen`); without it the section renders exactly as
 * before, so every existing call site is unchanged.
 */
export function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  if (!collapsible) {
    return (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {children}
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={clsx(styles.sectionChevron, open && styles.sectionChevronOpen)}>
            ›
          </span>
          {title}
        </button>
      </h3>
      {open && <div id={bodyId}>{children}</div>}
    </section>
  );
}

/** A field key/value pair for the `kvGrid` (renders a `<dt>` + `<dd>`). */
export function FieldRow({
  k,
  v,
  field,
}: {
  k: string;
  v: ReactNode;
  field?: string;
}) {
  return (
    <>
      <dt className={styles.kvKey}>
        <FieldKey label={k} field={field} />
      </dt>
      <dd className={styles.kvValue}>{v}</dd>
    </>
  );
}

/** A field label that carries a definition tooltip when the glossary has one. */
export function FieldKey({ label, field }: { label: string; field?: string }) {
  const tip = fieldTip(field ?? label);
  if (!tip) return <>{label}</>;
  return <Tooltip content={tip}>{label}</Tooltip>;
}
