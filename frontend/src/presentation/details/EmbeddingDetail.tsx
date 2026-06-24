import { Button } from "../components/ui/Button";
import type { DetailPanelProps } from "./DetailRegistry";
import {
  formatBytes,
  formatParamCount,
  formatShape,
} from "../components/ui/format";
import { useArchStore } from "../../store/archStore";
import { ClassificationSection } from "./ClassificationSection";
import { FieldRow } from "./DetailSection";
import { SourceViewer } from "./SourceViewer";
import styles from "./GenericDetailPanel.module.css";

export function EmbeddingDetail({ node, onExpand, onClose }: DetailPanelProps) {
  const spec = useArchStore((s) => s.spec);
  
  // Token vs positional is decided by the backend from facts (table size == vocab vs ==
  // context length) and shipped as `node.role` — not inferred from a wte/wpe name.
  let title = "Embedding Layer";
  let description = "Maps discrete token indices to continuous vectors.";
  let howItWorks = "It behaves as a fast lookup table. Instead of doing a matrix multiplication with a one-hot vector, the model directly retrieves the vector at the index of the token.";
  let usefulness = "Converts text token IDs into numerical vectors that the transformer layers can mathematically manipulate. Standard attention is position-invariant, so position embeddings are added to inject token order.";

  if (node.role === "token_embedding") {
    title = "Word Token Embeddings";
    description = "Converts input token IDs into their semantic vector representations.";
  } else if (node.role === "position_embedding") {
    title = "Word Position Embeddings";
    description = "Associates each absolute token position in the sequence with a unique vector.";
    howItWorks = "Maps each position index (0 to sequence length - 1) to a learned dense vector of the same dimension as the token embeddings.";
    usefulness = "Since the self-attention mechanism processes all tokens in parallel, it is permutation-invariant. Position embeddings inject sequence-order information back into the token representations.";
  }

  const numEmbeds = node.params.num_embeddings || (node.weight_shape ? node.weight_shape[0] : null);
  const embedDim = node.params.embedding_dim || (node.weight_shape ? node.weight_shape[1] : null);

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>{title}</div>
          {node.module_path && <div className={styles.headerMeta}>{node.module_path}</div>}
          <div className={styles.headerType}>nn.Embedding</div>
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
        <section className={styles.section} style={{ borderLeft: "4px solid color-mix(in srgb, var(--viz-io) 42%, var(--color-bg))", paddingLeft: "12px" }}>
          <h3 className={styles.sectionTitle} style={{ color: "color-mix(in srgb, var(--viz-io) 70%, var(--color-ink))" }}>Concept & Education</h3>
          <div className={styles.kvValue} style={{ fontWeight: "bold", marginBottom: "8px" }}>
            {description}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>How it works:</strong> {howItWorks}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "8px" }}>
            <strong>Why it matters:</strong> {usefulness}
          </div>
        </section>

        <ClassificationSection node={node} />

        {/* Configuration Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Parameters</h3>
          <dl className={styles.kvGrid}>
            {numEmbeds && (
              <FieldRow
                k="Vocabulary Size (N)"
                field="num_embeddings"
                v={numEmbeds.toLocaleString()}
              />
            )}
            {embedDim && (
              <FieldRow
                k="Embedding Dimension (D)"
                field="embedding_dim"
                v={embedDim.toLocaleString()}
              />
            )}
          </dl>
        </section>

        {/* Shapes Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Shapes</h3>
          <dl className={styles.kvGrid}>
            {node.input_shape && <FieldRow k="input" v={node.input_shape} />}
            {node.output_shape && <FieldRow k="output" v={node.output_shape} />}
            {node.weight_shape && <FieldRow k="weight" v={formatShape(node.weight_shape) ?? ""} />}
          </dl>
        </section>

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

        {/* Buffers Section */}
        {node.buffers && Object.keys(node.buffers).length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Buffers</h3>
            <dl className={styles.kvGrid}>
              {Object.entries(node.buffers).map(([name, shape]) => (
                <FieldRow key={name} k={name} v={formatShape(shape) ?? "[]"} />
              ))}
            </dl>
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
