import { clsx } from "clsx";
import type { BlockNodeProps } from "./BlockRegistry";
import { formatParamCount, formatBytes } from "../components/ui/format";
import styles from "./LinearNode.module.css";
import cardStyles from "./GenericBlockNode.module.css";

export function LinearNode({
  node,
  level,
  selected,
  role,
  onSelect,
}: BlockNodeProps) {
  const width = level === 1 ? 280 : 260;

  // The only semantic title we can state as fact is the LM head (a Linear whose output width
  // is the vocabulary — the backend's `lm_head` role). Every other Linear shows its real
  // module name; we don't guess "Query"/"Gate"/… from the state-dict name.
  const title = node.role === "lm_head" ? "Language Model Head" : node.label;

  const inFeatures = node.params.in_features || (node.weight_shape ? node.weight_shape[1] : null);
  const outFeatures = node.params.out_features || (node.weight_shape ? node.weight_shape[0] : null);

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
        styles.linearCard,
        selected && cardStyles.cardSelected,
        role === "input" && cardStyles.cardInput,
        role === "output" && cardStyles.cardOutput,
      )}
    >
      <div className={cardStyles.body}>
        <div className={styles.visualPattern}>
          <div className={styles.matrixRow}>
            <div className={styles.matrixGrid}>
              <div className={styles.matrixRow}>
                <span className={clsx(styles.dot, styles.dotActive)} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
              <div className={styles.matrixRow}>
                <span className={styles.dot} />
                <span className={clsx(styles.dot, styles.dotActive)} />
                <span className={styles.dot} />
              </div>
            </div>
            <span className={styles.mulSign}>×</span>
            <div className={styles.vectorBlock} />
            <span className={styles.mulSign}>=</span>
            <div className={styles.vectorBlock} style={{ backgroundColor: "#1d4ed8" }} />
          </div>
        </div>

        <div className={styles.titleContainer}>
          <div className={clsx(cardStyles.title, selected && cardStyles.titleSelected)}>
            {title}
          </div>
          <span className={styles.tag}>Linear</span>
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

        {inFeatures && outFeatures && (
          <div className={styles.dimsGrid}>
            <div className={styles.dimBox}>
              <span className={styles.dimLabel}>in features</span>
              <span className={styles.dimValue}>{inFeatures.toLocaleString()}</span>
            </div>
            <div className={styles.dimBox}>
              <span className={styles.dimLabel}>out features</span>
              <span className={styles.dimValue}>{outFeatures.toLocaleString()}</span>
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
