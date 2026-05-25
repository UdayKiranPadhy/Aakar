import { clsx } from "clsx";
import type { BlockNodeProps } from "./BlockRegistry";
import { formatParamCount, formatBytes } from "../components/ui/format";
import styles from "./EmbeddingNode.module.css";
import cardStyles from "./GenericBlockNode.module.css";

export function EmbeddingNode({
  node,
  level,
  selected,
  role,
  onSelect,
}: BlockNodeProps) {
  const width = level === 1 ? 280 : 260;
  
  const pathLower = (node.module_path || "").toLowerCase();
  let title = "Embedding Layer";
  if (pathLower.endsWith("wte") || pathLower.includes("embed_tokens")) {
    title = "Word Token Embeddings";
  } else if (pathLower.endsWith("wpe") || pathLower.includes("embed_positions") || pathLower.includes("position_embeddings")) {
    title = "Word Position Embeddings";
  }

  const numEmbeds = node.params.num_embeddings || (node.weight_shape ? node.weight_shape[0] : null);
  const embedDim = node.params.embedding_dim || (node.weight_shape ? node.weight_shape[1] : null);

  const handleClick = () => onSelect?.(node.id);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKey}
      style={{ width }}
      aria-label={title}
      className={clsx(
        cardStyles.card,
        styles.embeddingCard,
        selected && cardStyles.cardSelected,
        role === "input" && cardStyles.cardInput,
        role === "output" && cardStyles.cardOutput,
      )}
    >
      <div className={cardStyles.body}>
        <div className={styles.visualPattern}>
          <div className={styles.gridRow}>
            <span className={styles.gridCell}>ID</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.vectorBar} />
            <span className={styles.vectorBar} style={{ opacity: 0.7 }} />
            <span className={styles.vectorBar} style={{ opacity: 0.4 }} />
          </div>
        </div>

        <div className={styles.titleContainer}>
          <div className={clsx(cardStyles.title, selected && cardStyles.titleSelected)}>
            {title}
          </div>
          <span className={styles.tag}>Embedding</span>
        </div>

        {node.module_path && (
          <div className={cardStyles.meta}>
            {node.module_path}
          </div>
        )}
        {node.module_class && (
          <div className={cardStyles.meta}>
            {node.module_class}
          </div>
        )}

        {numEmbeds && embedDim && (
          <div className={styles.dimsGrid}>
            <div className={styles.dimBox}>
              <span className={styles.dimLabel}>vocab size</span>
              <span className={styles.dimValue}>{numEmbeds.toLocaleString()}</span>
            </div>
            <div className={styles.dimBox}>
              <span className={styles.dimLabel}>vector dim</span>
              <span className={styles.dimValue}>{embedDim.toLocaleString()}</span>
            </div>
          </div>
        )}

        {node.param_count !== undefined && node.param_count > 0 && (
          <div className={cardStyles.params}>
            {formatParamCount(node.param_count)} params
            {node.memory_bytes !== undefined && node.memory_bytes > 0 && (
              <span className={cardStyles.shapeAux}>  · {formatBytes(node.memory_bytes)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
