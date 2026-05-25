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
import styles from "./GenericDetailPanel.module.css";

export function LinearDetail({ node, onExpand, onClose }: DetailPanelProps) {
  const spec = useArchStore((s) => s.spec);

  const getLinearInfo = (path: string, defaultLabel: string) => {
    const p = path.toLowerCase();
    
    let title = defaultLabel;
    let description = "Applies a linear transformation to the incoming features.";
    let usefulness = "Performs projections between feature spaces, allowing the model to change hidden state dimensions or prepare vectors for specialized operations.";
    
    if (p.endsWith("lm_head")) {
      title = "Language Model Head";
      description = "Projects the final hidden states of the transformer back to vocabulary space.";
      usefulness = "Calculates logits for every token in the vocabulary. Applying Softmax on these logits yields the probability distribution for selecting the next token in the sequence.";
    } else {
      const inAttn = p.includes("attn") || p.includes("attention");
      const inMlp = p.includes("mlp") || p.includes("feedforward") || p.includes("ffn");
      
      if (inAttn) {
        if (p.endsWith("q_proj") || p.endsWith("query")) {
          title = "Query Projection";
          description = "Projects the token's hidden state into the 'Query' subspace.";
          usefulness = "Represents what the current token is looking for in other tokens. Paired with Key vectors, it determines the attention weights (alignment scores).";
        } else if (p.endsWith("k_proj") || p.endsWith("key")) {
          title = "Key Projection";
          description = "Projects the token's hidden state into the 'Key' subspace.";
          usefulness = "Represents the attributes this token offers for matching. Paired with Query vectors, it determines which tokens should attend to this one.";
        } else if (p.endsWith("v_proj") || p.endsWith("value")) {
          title = "Value Projection";
          description = "Projects the token's hidden state into the 'Value' subspace.";
          usefulness = "Represents the actual content/information that will be gathered and weighted based on the attention scores, then passed downstream.";
        } else if (p.endsWith("o_proj") || p.endsWith("out_proj") || p.endsWith("dense")) {
          title = "Attention Output Projection";
          description = "Projects the concatenated attention head outputs back to the model's hidden dimension.";
          usefulness = "Combines the information retrieved by all independent attention heads and maps it back to the main backbone representation, ready for residual addition.";
        } else if (p.endsWith("c_attn") || p.includes("qkv")) {
          title = "Query-Key-Value Projection";
          description = "A combined linear projection that computes the Query, Key, and Value vectors at once for speed.";
          usefulness = "Splits its output along the feature dimension to yield the Q, K, and V matrices, avoiding multiple separate kernel launches.";
        } else if (p.endsWith("c_proj")) {
          title = "Attention Output Projection";
          description = "Projects the concatenated attention outputs back to the model's hidden dimension.";
          usefulness = "Integrates the attention computation back into the main residual stream.";
        }
      } else if (inMlp) {
        if (p.endsWith("gate_proj") || p.endsWith("w1")) {
          title = "MLP Gate Projection";
          description = "Computes the gating activations (often before a SiLU or GELU activation).";
          usefulness = "Determines the routing/activation filter that modulates how much information flows through the parallel Up projection.";
        } else if (p.endsWith("up_proj") || p.endsWith("w3") || p.endsWith("c_fc")) {
          title = "MLP Gate/Up Projection";
          description = "Projects the hidden states to a higher intermediate dimension (often 2.67x or 4x size).";
          usefulness = "Enlarges the state representation so the model has high-capacity storage for semantic and factual key-value associations.";
        } else if (p.endsWith("down_proj") || p.endsWith("w2") || p.endsWith("c_proj")) {
          title = "MLP Down Projection";
          description = "Projects the expanded MLP intermediate representation back to the main hidden dimension.";
          usefulness = "Compresses the factual/associative memory output back down to the backbone size to merge back into the main residual stream.";
        }
      }
    }
    
    return { title, description, usefulness };
  };

  const { title, description, usefulness } = getLinearInfo(node.module_path || "", node.label);
  
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
        <section className={styles.section} style={{ borderLeft: "4px solid #bfdbfe", paddingLeft: "12px" }}>
          <h3 className={styles.sectionTitle} style={{ color: "#1d4ed8" }}>Concept & Education</h3>
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
