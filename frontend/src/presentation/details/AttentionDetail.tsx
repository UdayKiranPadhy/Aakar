/**
 * Detail panel for attention blocks (registered on the backend's `role: "attention"`,
 * so it serves every model family without naming a class). Teaches the attention
 * mechanism and surfaces the head grouping + implementation — but only ever shows a
 * fact the backend actually provided: every row guards on presence, so the panel
 * still renders for a model that exposes none of the head facts.
 */

import { Button } from "../components/ui/Button";
import type { DetailPanelProps } from "./DetailRegistry";
import { formatBytes, formatFlops, formatParamCount } from "../components/ui/format";
import { useArchStore } from "../../store/archStore";
import { AttentionGqaDiagram } from "./AttentionGqaDiagram";
import { ClassificationSection } from "./ClassificationSection";
import { FieldRow, Section } from "./DetailSection";
import { ModuleAttributesSection } from "./ModuleAttributesSection";
import { OperationsSection } from "./OperationsSection";
import { SourceViewer } from "./SourceViewer";
import { ViewAllConfigLink } from "./ViewAllConfigLink";
import styles from "./GenericDetailPanel.module.css";

const TONE = "var(--viz-attention)";

/** Friendly labels for the flops_detail components (keys stay the glossary key via `field`). */
const FLOPS_LABELS: Record<string, string> = {
  attn_scores: "Q·Kᵀ scores",
  attn_context: "scores·V context",
  matmul: "matmul",
  norm: "normalization",
};

const PIPELINE = ["Q·Kᵀ", "÷ √dₖ", "softmax", "· V"];

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function AttentionDetail({ node, onExpand, onClose }: DetailPanelProps) {
  const spec = useArchStore((s) => s.spec);
  const cfg = spec?.config_summary ?? {};

  // Prefer the per-node curated fact, then the model-wide config summary. Omit if neither.
  const numHeads = asNumber(node.params.num_heads) ?? asNumber(cfg.num_attention_heads);
  const headDim = asNumber(node.params.head_dim) ?? asNumber(cfg.head_dim);
  const kvHeads =
    asNumber(node.params.num_key_value_heads) ?? asNumber(cfg.num_key_value_heads);
  const gqaRatio =
    asNumber(node.params.gqa_ratio) ??
    asNumber(cfg.gqa_ratio) ??
    (numHeads && kvHeads && kvHeads > 0 ? Math.round(numHeads / kvHeads) : undefined);
  const attnImpl = spec?.attn_impl;

  // Attention regime — stated only when both head counts are known (a true fact).
  const regime =
    numHeads && kvHeads
      ? kvHeads === 1
        ? "Multi-Query Attention (MQA)"
        : kvHeads < numHeads
          ? "Grouped-Query Attention (GQA)"
          : "Multi-Head Attention (MHA)"
      : undefined;

  const intermediates = node.intermediates ?? {};
  const flopsDetail = node.flops_detail ?? null;
  const flopsTotal = flopsDetail
    ? Object.values(flopsDetail).reduce((sum, v) => sum + v, 0)
    : null;

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>Self-Attention</div>
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
            Lets every token gather information from the other tokens it should attend to.
          </div>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "8px 0" }}
            aria-hidden
          >
            {PIPELINE.map((step, i) => (
              <span key={step} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <code
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                    background: `color-mix(in srgb, ${TONE} 12%, var(--color-bg))`,
                    border: `1px solid color-mix(in srgb, ${TONE} 30%, var(--color-bg))`,
                  }}
                >
                  {step}
                </code>
                {i < PIPELINE.length - 1 && (
                  <span style={{ color: "var(--color-ink-subtle)", fontSize: "11px" }}>→</span>
                )}
              </span>
            ))}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>How it works:</strong> each token forms a Query, Key and Value. Scores{" "}
            <code>Q·Kᵀ</code> are scaled by <code>1/√head_dim</code>, softmaxed into weights,
            then used to take a weighted sum of the Values.
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>Why it matters:</strong> this is how the model mixes context across the
            sequence — the core mechanism relating distant tokens.
          </div>
        </section>

        <ClassificationSection node={node} />

        {/* Attention configuration — each row only when its fact is known. */}
        {(numHeads || headDim || kvHeads || regime || attnImpl) && (
          <Section title="Attention">
            <dl className={styles.kvGrid}>
              {regime && <FieldRow k="regime" v={regime} />}
              {numHeads !== undefined && (
                <FieldRow k="Query heads" field="num_heads" v={numHeads.toLocaleString()} />
              )}
              {kvHeads !== undefined && (
                <FieldRow
                  k="Key/value heads"
                  field="num_key_value_heads"
                  v={kvHeads.toLocaleString()}
                />
              )}
              {gqaRatio !== undefined && gqaRatio > 1 && (
                <FieldRow k="GQA ratio" field="gqa_ratio" v={`${gqaRatio}:1`} />
              )}
              {headDim !== undefined && (
                <FieldRow k="Head dim" field="head_dim" v={headDim.toLocaleString()} />
              )}
              {attnImpl && (
                <FieldRow k="Implementation" field="attn_impl" v={`${attnImpl} (model-wide)`} />
              )}
            </dl>
            {numHeads !== undefined && kvHeads !== undefined && (
              <AttentionGqaDiagram numHeads={numHeads} kvHeads={kvHeads} />
            )}
          </Section>
        )}

        {/* Tensor path — the multi-head reshape exposes GQA grouping for free. */}
        {Object.keys(intermediates).length > 0 && (
          <Section title="Tensor path">
            <dl className={styles.kvGrid}>
              {Object.entries(intermediates).map(([name, shape]) => (
                <FieldRow key={name} k={name} field={name} v={shape} />
              ))}
            </dl>
          </Section>
        )}

        {/* Shapes */}
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

        {/* SDPA compute breakdown (the projections live on the child Linear nodes). */}
        {flopsDetail && flopsTotal !== null && (
          <Section title="Compute (forward)">
            <dl className={styles.kvGrid}>
              {Object.entries(flopsDetail).map(([key, value]) => (
                <FieldRow key={key} k={FLOPS_LABELS[key] ?? key} field={key} v={formatFlops(value)} />
              ))}
            </dl>
            <div className={styles.subtle} style={{ marginTop: "4px" }}>
              {formatFlops(flopsTotal)} total
              {spec?.flops_reference && (
                <span className={styles.dim}>
                  {" "}
                  at B={spec.flops_reference.batch_size}, S={spec.flops_reference.seq_len}
                </span>
              )}
            </div>
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
