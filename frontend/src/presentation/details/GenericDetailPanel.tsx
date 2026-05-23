/**
 * Default detail-panel content — used for every node type in v0.1.
 *
 * Renders three sections: Configuration (from params), Parameters (param_count),
 * Shapes (input/output_shape). Each section is hidden if the relevant data
 * is absent.
 */

import { Button } from "../components/ui/Button";
import type { DetailPanelProps } from "./DetailRegistry";
import { formatParamCount } from "../components/ui/format";
import styles from "./GenericDetailPanel.module.css";

export function GenericDetailPanel({ node, onExpand, onClose }: DetailPanelProps) {
  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>{node.label}</div>
          {node.meta && <div className={styles.headerMeta}>{node.meta}</div>}
          <div className={styles.headerType}>{node.type}</div>
        </div>
        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          className={styles.closeButton}
        >
          ✕
        </button>
      </header>

      <div className={styles.body}>
        <ParamsSection params={node.params} />
        <ParamCountSection paramCount={node.param_count} />
        <ShapesSection input={node.input_shape} output={node.output_shape} />
      </div>

      {node.has_internals && onExpand && (
        <footer className={styles.footer}>
          <Button
            variant="primary"
            size="md"
            className={styles.footerButton}
            onClick={() => onExpand(node.id)}
          >
            Expand internals
          </Button>
        </footer>
      )}
    </div>
  );
}

function ParamsSection({
  params,
}: {
  params: Readonly<Record<string, string | number | boolean>>;
}) {
  const entries = Object.entries(params);
  if (entries.length === 0) return null;
  return (
    <Section title="Configuration">
      <dl className={styles.kvGrid}>
        {entries.map(([k, v]) => (
          <Row key={k} k={k} v={String(v)} />
        ))}
      </dl>
    </Section>
  );
}

function ParamCountSection({ paramCount }: { paramCount?: number }) {
  if (paramCount === undefined) return null;
  return (
    <Section title="Parameters">
      <div className={styles.paramCount}>
        {formatParamCount(paramCount)}
        <span className={styles.paramCountSecondary}>
          ({paramCount.toLocaleString()})
        </span>
      </div>
    </Section>
  );
}

function ShapesSection({ input, output }: { input?: string; output?: string }) {
  if (!input && !output) return null;
  return (
    <Section title="Shapes">
      <dl className={styles.kvGrid}>
        {input && <Row k="input" v={input} />}
        {output && <Row k="output" v={output} />}
      </dl>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className={styles.kvKey}>{k}</dt>
      <dd className={styles.kvValue}>{v}</dd>
    </>
  );
}
