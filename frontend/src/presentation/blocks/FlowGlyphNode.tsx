import type { KeyboardEvent } from "react";
import { clsx } from "clsx";

import type { BlockNodeProps } from "./BlockRegistry";
import styles from "./FlowGlyphNode.module.css";

export function FlowGlyphNode({ node, selected, visualTone, onSelect }: BlockNodeProps) {
  const clickable = !!onSelect;
  const activate = () => onSelect?.(node.id);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  };

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? activate : undefined}
      onKeyDown={clickable ? onKeyDown : undefined}
      className={clsx(
        styles.glyph,
        clickable && styles.clickable,
        selected && styles.selected,
        visualTone && styles[`tone_${visualTone}`],
      )}
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
