/**
 * Default block renderer — handles every node type in v0.1.
 *
 * Visual anatomy:
 *   - White card, 1px gray hairline border, 8px radius
 *   - 280px wide at level 1, 260px at levels 2-3
 *   - Title in Google Sans 14px medium
 *   - Meta in Google Sans Code 11px gray
 *   - Selected: 2px accent border + accent title
 *   - If `has_internals` and selected: floating "Expand internals" pill
 */

import { clsx } from "clsx";

import type { BlockNodeProps } from "./BlockRegistry";
import { Pill } from "../components/ui/Pill";
import { formatParamCount } from "../components/ui/format";
import styles from "./GenericBlockNode.module.css";

export function GenericBlockNode({
  node,
  level,
  selected,
  onSelect,
  onExpand,
}: BlockNodeProps) {
  const width = level === 1 ? 280 : 260;

  const handleClick = () => onSelect?.(node.id);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(node.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKey}
      style={{ width }}
      className={clsx(styles.card, selected && styles.cardSelected)}
    >
      <div className={styles.body}>
        <div className={clsx(styles.title, selected && styles.titleSelected)}>
          {node.label}
        </div>

        {node.meta && <div className={styles.meta}>{node.meta}</div>}

        {node.param_count !== undefined && node.param_count > 0 && (
          <div className={styles.params}>
            {formatParamCount(node.param_count)} params
          </div>
        )}
      </div>

      {selected && node.has_internals && onExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand(node.id);
          }}
          className={styles.expandButton}
        >
          <Pill tone="accent">Expand internals ↗</Pill>
        </button>
      )}
    </div>
  );
}
