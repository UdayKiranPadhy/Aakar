/**
 * Detail panel for mixture-of-experts blocks (registered on the backend's
 * `role: "moe"`). Explains sparse expert routing and surfaces the expert/top-k
 * counts and expert width — each row only when the backend supplied the fact.
 */

import { Button } from "../components/ui/Button";
import type { DetailPanelProps } from "./DetailRegistry";
import { formatBytes, formatParamCount } from "../components/ui/format";
import { useArchStore } from "../../store/archStore";
import { ClassificationSection } from "./ClassificationSection";
import { FieldRow, Section } from "./DetailSection";
import { ModuleAttributesSection } from "./ModuleAttributesSection";
import { OperationsSection } from "./OperationsSection";
import { SourceViewer } from "./SourceViewer";
import { ViewAllConfigLink } from "./ViewAllConfigLink";
import styles from "./GenericDetailPanel.module.css";

const TONE = "var(--viz-mlp)";

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function MoeDetail({ node, onExpand, onClose }: DetailPanelProps) {
  const spec = useArchStore((s) => s.spec);
  const cfg = spec?.config_summary ?? {};

  const numExperts =
    asNumber(node.params.num_experts) ??
    asNumber(node.params.num_local_experts) ??
    asNumber(cfg.num_local_experts) ??
    asNumber(cfg.num_experts);
  const topK =
    asNumber(node.params.num_experts_per_tok) ?? asNumber(cfg.num_experts_per_tok);
  const expertWidth =
    asNumber(node.params.moe_intermediate_size) ??
    asNumber(node.params.intermediate_size) ??
    asNumber(cfg.intermediate_size);

  // "Active fraction" is a true ratio only when both counts are known.
  const activePct =
    numExperts && topK && numExperts > 0 ? Math.round((topK / numExperts) * 100) : undefined;

  const intermediates = node.intermediates ?? {};

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>Mixture of Experts</div>
          {node.module_path && <div className={styles.headerMeta}>{node.module_path}</div>}
          {node.module_class && <div className={styles.headerType}>{node.module_class}</div>}
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
        {/* Educational Section */}
        <section
          className={styles.section}
          style={{
            borderLeft: `4px solid color-mix(in srgb, ${TONE} 42%, var(--color-bg))`,
            paddingLeft: "12px",
          }}
        >
          <h3
            className={styles.sectionTitle}
            style={{ color: `color-mix(in srgb, ${TONE} 70%, var(--color-ink))` }}
          >
            Concept & Education
          </h3>
          <div className={styles.kvValue} style={{ fontWeight: "bold", marginBottom: "8px" }}>
            Replaces one big feed-forward block with many expert FFNs, routing each
            token to only a few.
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>How it works:</strong> a small router scores the experts for each token,
            picks the top-k, runs the token through just those, and combines their outputs
            weighted by the router scores.
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>Why it matters:</strong> total capacity grows with the number of experts,
            but compute per token stays near a single FFN — more parameters at similar cost.
          </div>
        </section>

        <ClassificationSection node={node} />

        {/* Routing — each row only when its fact is known. */}
        {(numExperts || topK || expertWidth) && (
          <Section title="Routing">
            <dl className={styles.kvGrid}>
              {numExperts !== undefined && (
                <FieldRow k="Experts" field="num_experts" v={numExperts.toLocaleString()} />
              )}
              {topK !== undefined && (
                <FieldRow
                  k="Active per token"
                  field="num_experts_per_tok"
                  v={`${topK}${activePct !== undefined ? ` · ~${activePct}%` : ""}`}
                />
              )}
              {expertWidth !== undefined && (
                <FieldRow
                  k="Expert width"
                  field="intermediate_size"
                  v={expertWidth.toLocaleString()}
                />
              )}
            </dl>
          </Section>
        )}

        {Object.keys(intermediates).length > 0 && (
          <Section title="Tensor path">
            <dl className={styles.kvGrid}>
              {Object.entries(intermediates).map(([name, shape]) => (
                <FieldRow key={name} k={name} field={name} v={shape} />
              ))}
            </dl>
          </Section>
        )}

        {(node.input_shape || node.output_shape) && (
          <Section title="Shapes">
            <dl className={styles.kvGrid}>
              {node.input_shape && <FieldRow k="input" v={node.input_shape} />}
              {node.output_shape && <FieldRow k="output" v={node.output_shape} />}
            </dl>
          </Section>
        )}

        <OperationsSection operations={node.operations} />

        {node.source_url && (
          <Section title="Source">
            <SourceViewer url={node.source_url} />
          </Section>
        )}

        {node.param_count !== undefined && node.param_count > 0 && (
          <Section title="Parameters">
            <div className={styles.paramCount}>
              {formatParamCount(node.param_count)}
              <span className={styles.paramCountSecondary}>
                ({node.param_count.toLocaleString()})
              </span>
            </div>
            {node.memory_bytes !== undefined && (
              <div className={styles.subtle}>
                {formatBytes(node.memory_bytes)}
                {spec?.param_dtype && <span className={styles.dim}> · {spec.param_dtype}</span>}
              </div>
            )}
          </Section>
        )}

        <ModuleAttributesSection node={node} />
        <ViewAllConfigLink />
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
