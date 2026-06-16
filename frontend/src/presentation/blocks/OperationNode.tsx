/**
 * Renders one traced forward-pass operation as a compact canvas glyph, used by
 * the operation-flow view (`operationFlow.ts`). Colour follows the op `category`
 * via the shared `opCategoryTone`, so a glyph matches its row in the detail
 * panel's ops list.
 *
 * Clickable only when an `onSelect` is supplied (the click-to-explain wiring).
 * Ops are never drillable, so there's no expand affordance.
 */

import type { CSSProperties, KeyboardEvent } from "react";
import { clsx } from "clsx";

import type { BlockNodeProps } from "./BlockRegistry";
import { opCategoryTone } from "../components/ui/opCategoryTone";
import styles from "./OperationNode.module.css";

export function OperationNode({ node, selected, role, onSelect }: BlockNodeProps) {
  const category =
    typeof node.params.category === "string" ? node.params.category : "other";
  const tone = opCategoryTone(category);
  const vars = { "--cat": tone.color, "--cat-bg": tone.bg } as CSSProperties;

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
      aria-label={node.meta ? `${node.label} ${node.meta}` : node.label}
      className={clsx(
        styles.op,
        clickable && styles.clickable,
        selected && styles.selected,
        role === "input" && styles.input,
        role === "output" && styles.output,
      )}
      style={vars}
    >
      <span className={styles.badge}>{category}</span>
      <span className={styles.label}>{node.label}</span>
      {node.meta && <span className={styles.shape}>{node.meta}</span>}
    </div>
  );
}
