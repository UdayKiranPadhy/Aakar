/**
 * Detail panel for normalization layers (registered on the backend's
 * `role: "norm"`). Explains normalization and the LayerNorm-vs-RMSNorm
 * distinction — but determines that distinction from FACTS only:
 *   - the operations trace (RMSNorm runs pow/mean/rsqrt/mul; LayerNorm runs
 *     a native_layer_norm) — definitive when present;
 *   - the presence of a learnable bias (LayerNorm centers and usually adds a
 *     bias; RMSNorm has neither).
 * The class name is shown verbatim as a label, never branched on.
 */

import { Button } from "../components/ui/Button";
import type { DetailPanelProps } from "./DetailRegistry";
import { formatBytes, formatParamCount, formatShape } from "../components/ui/format";
import { useArchStore } from "../../store/archStore";
import { ClassificationSection } from "./ClassificationSection";
import { FieldRow, Section } from "./DetailSection";
import { ModuleAttributesSection } from "./ModuleAttributesSection";
import { OperationsSection } from "./OperationsSection";
import { SourceViewer } from "./SourceViewer";
import { ViewAllConfigLink } from "./ViewAllConfigLink";
import type { Operation } from "../../domain/spec";
import styles from "./GenericDetailPanel.module.css";

const TONE = "var(--viz-norm)";

/** Variant from the actual ops dispatched (a fact), or undefined when not traced yet. */
function observedVariant(ops?: ReadonlyArray<Operation>): "LayerNorm" | "RMSNorm" | undefined {
  if (!ops) return undefined;
  for (const op of ops) {
    const name = op.op.toLowerCase();
    if (name.includes("layer_norm")) return "LayerNorm";
    if (name === "rsqrt" || name.includes("rms")) return "RMSNorm";
  }
  return undefined;
}

function formatNormalizedShape(value: unknown): string | undefined {
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return undefined;
}

export function NormalizationDetail({ node, onExpand, onClose }: DetailPanelProps) {
  const spec = useArchStore((s) => s.spec);

  const eps = node.params.eps;
  const normalizedShape = formatNormalizedShape(node.params.normalized_shape);
  const hasScale = !!node.weight_shape && node.weight_shape.length > 0;
  const hasBias = node.bias_shape != null;
  const variant = observedVariant(node.operations);

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>Normalization</div>
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
            Rescales each token's activation vector to a stable magnitude before the
            next sub-layer.
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>LayerNorm</strong> subtracts the mean and divides by the standard
            deviation, then applies a learnable scale (and usually a bias).
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>RMSNorm</strong> skips the mean-subtraction and divides by the
            root-mean-square only, with a learnable scale and no bias — cheaper, and the
            norm of choice in most modern LLMs.
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>Why it matters:</strong> keeps activations well-scaled so deep stacks
            train stably without exploding or vanishing.
          </div>
        </section>

        <ClassificationSection node={node} />

        {/* Facts — each row only when known. */}
        {(variant || eps !== undefined || normalizedShape || hasScale) && (
          <Section title="Normalization">
            <dl className={styles.kvGrid}>
              {variant && <FieldRow k="Variant (traced)" v={variant} />}
              {eps !== undefined && <FieldRow k="eps" field="eps" v={String(eps)} />}
              {normalizedShape && (
                <FieldRow k="Normalized shape" field="normalized_shape" v={normalizedShape} />
              )}
              <FieldRow k="Learnable scale" v={hasScale ? "Yes" : "No"} />
              <FieldRow k="Learnable bias" v={hasBias ? "Yes" : "No"} />
            </dl>
          </Section>
        )}

        {/* Shapes */}
        {(node.input_shape || node.output_shape || node.weight_shape || node.bias_shape) && (
          <Section title="Shapes">
            <dl className={styles.kvGrid}>
              {node.input_shape && <FieldRow k="input" v={node.input_shape} />}
              {node.output_shape && <FieldRow k="output" v={node.output_shape} />}
              {node.weight_shape && (
                <FieldRow k="weight" v={formatShape(node.weight_shape) ?? ""} />
              )}
              {node.bias_shape && <FieldRow k="bias" v={formatShape(node.bias_shape) ?? ""} />}
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
