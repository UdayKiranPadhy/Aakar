import { clsx } from "clsx";

import type { BlockNodeProps } from "./BlockRegistry";
import styles from "./FlowGlyphNode.module.css";

export function FlowGlyphNode({ node, visualTone }: BlockNodeProps) {
  return (
    <div
      className={clsx(styles.glyph, visualTone && styles[`tone_${visualTone}`])}
      aria-label={node.label}
    >
      <div className={styles.symbol}>{symbolFor(node.type)}</div>
      <div className={styles.label}>{node.label}</div>
      {node.meta && <div className={styles.meta}>{node.meta}</div>}
    </div>
  );
}

function symbolFor(type: string): string {
  if (type === "flow_residual" || type === "mlp_multiply") return "+";
  if (type === "attention_heads") return "H";
  if (type === "attention_scores") return "QK";
  if (type === "attention_softmax") return "S";
  if (type === "attention_mix") return "V";
  if (type === "flow_input") return "x";
  return "·";
}
