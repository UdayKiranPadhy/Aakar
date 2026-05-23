/**
 * Compact renderer for an individual `attention_head` node.
 *
 * At level 4 we render `num_heads` of these side-by-side (8 wide for GPT-2,
 * up to 32 for Llama-3-8B). Using the default 260-px card would make the
 * grid 2500+ px wide — React Flow's fitView then zooms out enough that text
 * becomes unreadable. This compact 160-px card keeps the whole grid
 * comfortably inside a normal viewport at zoom ≈ 1.
 *
 * Heads are leaves (no internals to drill into); click opens the right-side
 * detail panel, same UX as Dropout / +residual.
 */

import { clsx } from "clsx";

import type { BlockNodeProps } from "./BlockRegistry";
import styles from "./AttentionHeadNode.module.css";

export function AttentionHeadNode({ node, selected, role, onSelect }: BlockNodeProps) {
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
      aria-label={node.label}
      className={clsx(
        styles.card,
        selected && styles.cardSelected,
        role === "input" && styles.cardInput,
        role === "output" && styles.cardOutput,
      )}
    >
      <div className={clsx(styles.title, selected && styles.titleSelected)}>
        {node.label}
      </div>
      {node.meta && <div className={styles.meta}>{node.meta}</div>}
    </div>
  );
}
