import { Button } from "../components/ui/Button";
import type { DetailPanelProps } from "./DetailRegistry";
import {
  formatBytes,
  formatFlops,
  formatParamCount,
  formatShape,
} from "../components/ui/format";
import { useArchStore } from "../../store/archStore";
import { BackendFieldsSection } from "./BackendFieldsSection";
import { OperationsSection } from "./OperationsSection";
import { SourceViewer } from "./SourceViewer";
import styles from "./GenericDetailPanel.module.css";

export function LinearDetail({ node, onExpand, onClose }: DetailPanelProps) {
  const spec = useArchStore((s) => s.spec);

  // The one Linear we can name from facts is the LM head (output width == vocabulary →
  // the backend's `lm_head` role). Every other Linear keeps its real module name and a
  // generic description — we don't guess "Query"/"Gate"/… from the state-dict name, and a
  // bare leaf has no parent context to infer its role from anyway.
  const { title, description, usefulness } =
    node.role === "lm_head"
      ? {
          title: "Language Model Head",
          description:
            "Projects the final hidden states of the transformer back to vocabulary space.",
          usefulness:
            "Calculates logits for every token in the vocabulary. Applying Softmax on these logits yields the probability distribution for selecting the next token in the sequence.",
        }
      : {
          title: node.label,
          description: "Applies a linear transformation to the incoming features.",
          usefulness:
            "Performs projections between feature spaces, allowing the model to change hidden state dimensions or prepare vectors for specialized operations.",
        };

  const inFeatures = node.params.in_features || (node.weight_shape ? node.weight_shape[1] : null);
  const outFeatures = node.params.out_features || (node.weight_shape ? node.weight_shape[0] : null);
  const hasBias = node.params.has_bias !== undefined ? node.params.has_bias : node.bias_shape != null;

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>{title}</div>
          {node.module_path && <div className={styles.headerMeta}>{node.module_path}</div>}
          <div className={styles.headerType}>nn.Linear</div>
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
        <section className={styles.section} style={{ borderLeft: "4px solid color-mix(in srgb, var(--color-accent) 42%, var(--color-bg))", paddingLeft: "12px" }}>
          <h3 className={styles.sectionTitle} style={{ color: "color-mix(in srgb, var(--color-accent) 70%, var(--color-ink))" }}>Concept & Education</h3>
          <div className={styles.kvValue} style={{ fontWeight: "bold", marginBottom: "8px" }}>
            {description}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>How it works:</strong> Performs matrix multiplication: <code>y = xWᵀ + b</code>, projecting inputs from dimension <code>{inFeatures?.toLocaleString() ?? "in"}</code> to <code>{outFeatures?.toLocaleString() ?? "out"}</code>.
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>Why it matters:</strong> {usefulness}
          </div>
        </section>

        <BackendFieldsSection node={node} />

        {/* Configuration Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Parameters</h3>
          <dl className={styles.kvGrid}>
            {inFeatures && <Row k="Input Features (in_features)" v={inFeatures.toLocaleString()} />}
            {outFeatures && <Row k="Output Features (out_features)" v={outFeatures.toLocaleString()} />}
            <Row k="Has Bias" v={hasBias ? "Yes" : "No"} />
          </dl>
        </section>

        {/* Shapes Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Shapes</h3>
          <dl className={styles.kvGrid}>
            {node.input_shape && <Row k="input" v={node.input_shape} />}
            {node.output_shape && <Row k="output" v={node.output_shape} />}
            {node.weight_shape && <Row k="weight" v={formatShape(node.weight_shape) ?? ""} />}
            {node.bias_shape && <Row k="bias" v={formatShape(node.bias_shape) ?? ""} />}
          </dl>
        </section>

        <OperationsSection operations={node.operations} />

        {node.source_url && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Source</h3>
            <SourceViewer url={node.source_url} />
          </section>
        )}

        {/* Parameters Section */}
        {node.param_count !== undefined && node.param_count > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Weight Details</h3>
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
          </section>
        )}

        {/* Compute Section */}
        {node.flops !== undefined && node.flops !== null && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Compute (forward)</h3>
            <div className={styles.paramCount}>
              {formatFlops(node.flops)}
              <span className={styles.paramCountSecondary}>
                ({node.flops.toLocaleString()} ops)
              </span>
            </div>
            {spec?.flops_reference && (
              <div className={styles.subtle}>
                at B={spec.flops_reference.batch_size}, S={spec.flops_reference.seq_len}
              </div>
            )}
          </section>
        )}
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className={styles.kvKey}>{k}</dt>
      <dd className={styles.kvValue}>{v}</dd>
    </>
  );
}
