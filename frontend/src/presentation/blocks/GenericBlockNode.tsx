/**
 * Default block renderer — handles every node type in v0.1.
 *
 * Interaction model:
 *   - Click / Enter / Space on ANY card  → selects the node and opens the
 *     right-side detail panel with that node's params / shapes / param count.
 *   - On a card with internals, a small "Expand internals ↗" pill appears in
 *     the top-right corner once it's selected. Clicking that pill (or the
 *     "Expand internals" button at the bottom of the detail panel) is what
 *     drills into the next zoom level.
 *
 * This deliberate two-step (preview → confirm-by-pill) matches how the user
 * expects to first inspect a block's details before committing to a zoom.
 *
 * Visual anatomy:
 *   - White card, 1px gray hairline border, 8px radius
 *   - 280px wide at level 1, 260px at levels 2-3
 *   - Title in Google Sans 14px medium
 *   - Meta in Google Sans Code 11px gray
 *   - Selected (any node): 2px accent border + accent title
 *   - role="input"  → 2px green border (predecessor of the selected node)
 *   - role="output" → 2px amber border (successor of the selected node)
 *   - has_internals + selected → corner pill "Expand internals ↗"
 */

import { clsx } from "clsx";

import type { BlockNodeProps } from "./BlockRegistry";
import { Pill } from "../components/ui/Pill";
import {
  formatBytes,
  formatFlops,
  formatParamCount,
  formatShape,
} from "../components/ui/format";
import styles from "./GenericBlockNode.module.css";

export function GenericBlockNode({
  node,
  level,
  selected,
  role,
  visualVariant,
  visualTone,
  onSelect,
  onExpand,
}: BlockNodeProps) {
  if (visualVariant === "layer-cell") {
    return (
      <LayerCellNode
        node={node}
        selected={selected}
        role={role}
        onSelect={onSelect}
        onExpand={onExpand}
      />
    );
  }

  const width = level === 1 ? 280 : 260;
  const canExpand = !!node.has_internals && !!onExpand;
  const showMatrixGlyph = isMatrixLike(node.type);

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
      aria-label={node.label}
      className={clsx(
        styles.card,
        selected && styles.cardSelected,
        role === "input" && styles.cardInput,
        role === "output" && styles.cardOutput,
        visualTone && styles[`tone_${visualTone}`],
      )}
    >
      <div className={styles.body}>
        {showMatrixGlyph && <MatrixGlyph node={node} />}

        <div className={clsx(styles.title, selected && styles.titleSelected)}>
          {node.label}
        </div>

        {(node.module_class || node.meta) && (
          <div className={styles.meta}>{node.module_class ?? node.meta}</div>
        )}
        {node.module_path && <div className={styles.meta}>{node.module_path}</div>}

        {(node.input_shape || node.output_shape) && (
          <div className={styles.io}>
            {node.input_shape && (
              <span className={styles.ioRow}>
                <span className={styles.ioKey}>in</span>
                <span className={styles.ioVal}>{node.input_shape}</span>
              </span>
            )}
            {node.output_shape && (
              <span className={styles.ioRow}>
                <span className={styles.ioKey}>out</span>
                <span className={styles.ioVal}>{node.output_shape}</span>
              </span>
            )}
          </div>
        )}

        {formatShape(node.weight_shape) && (
          <div className={styles.shape}>
            W {formatShape(node.weight_shape)}
            {node.bias_shape && node.bias_shape.length > 0 && (
              <span className={styles.shapeAux}>  · +bias</span>
            )}
          </div>
        )}

        {node.param_count !== undefined && node.param_count > 0 && (
          <div className={styles.params}>
            {formatParamCount(node.param_count)} params
            {node.memory_bytes !== undefined && node.memory_bytes > 0 && (
              <span className={styles.shapeAux}>  · {formatBytes(node.memory_bytes)}</span>
            )}
          </div>
        )}

        {node.flops !== undefined && node.flops > 0 && (
          <div className={styles.flops}>{formatFlops(node.flops)}</div>
        )}
      </div>

      {selected && canExpand && (
        <button
          type="button"
          className={styles.expandButton}
          onClick={(e) => {
            // Stop the click from bubbling to the card's onClick (which would
            // just re-select). The pill is the *only* path to actually
            // drilling into the next level from the canvas.
            e.stopPropagation();
            onExpand!(node.id);
          }}
          aria-label={`Expand ${node.label} internals`}
        >
          <Pill tone="accent">Expand internals ↗</Pill>
        </button>
      )}
    </div>
  );
}

function LayerCellNode({
  node,
  selected,
  role,
  onSelect,
  onExpand,
}: Pick<BlockNodeProps, "node" | "selected" | "role" | "onSelect" | "onExpand">) {
  const canExpand = !!node.has_internals && !!onExpand;
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
        styles.layerCell,
        selected && styles.cardSelected,
        role === "input" && styles.cardInput,
        role === "output" && styles.cardOutput,
      )}
    >
      <div className={styles.layerIndex}>{node.label}</div>
      {node.meta && <div className={styles.layerMeta}>{node.meta}</div>}
      {node.param_count !== undefined && node.param_count > 0 && (
        <div className={styles.layerStats}>{formatParamCount(node.param_count)}</div>
      )}
      {selected && canExpand && (
        <button
          type="button"
          className={styles.layerExpandButton}
          onClick={(e) => {
            e.stopPropagation();
            onExpand!(node.id);
          }}
          aria-label={`Expand ${node.label} internals`}
        >
          <Pill tone="accent">Open</Pill>
        </button>
      )}
    </div>
  );
}

function MatrixGlyph({ node }: { node: BlockNodeProps["node"] }) {
  const shape = formatShape(node.weight_shape);
  return (
    <div className={styles.matrixGlyph} aria-hidden="true">
      <span className={styles.matrixBarTall} />
      <span className={styles.matrixBarMid} />
      <span className={styles.matrixBarShort} />
      {shape && <span className={styles.matrixShape}>{shape}</span>}
    </div>
  );
}

function isMatrixLike(type: string): boolean {
  return type === "linear" || type === "conv1_d" || type === "embedding";
}
