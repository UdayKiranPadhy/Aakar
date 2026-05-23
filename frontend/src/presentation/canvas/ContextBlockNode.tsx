/**
 * React Flow node type for the floating "previous block" / "next block"
 * context callouts that sit above and below the current expanded view.
 *
 * One component, two directions:
 *   - `direction: "previous"` → renders above the canvas with a
 *     downward-pointing tail. Bottom source handle so the edge from this
 *     card flows into the current view's first node.
 *   - `direction: "next"`     → renders below the canvas with an
 *     upward-pointing tail. Top target handle so the edge into this card
 *     comes from the current view's last node.
 *
 * Clicking either card calls `goToExpansion(contextPath)` and jumps to that
 * sibling's internals — one-click navigation through a block stack.
 */

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { clsx } from "clsx";

import type { ExpansionPath } from "../../domain/navigation";
import type { Node as SpecNode } from "../../domain/spec";
import { useArchStore } from "../../store/archStore";
import styles from "./ContextBlockNode.module.css";

export type ContextDirection = "previous" | "next";

export type ContextBlockData = {
  specNode: SpecNode;
  contextPath: ExpansionPath;
  direction: ContextDirection;
};

const HIDDEN_HANDLE_STYLE = {
  background: "transparent",
  border: "none",
  width: 1,
  height: 1,
};

export function ContextBlockFlowNode({ data }: NodeProps) {
  const d = data as ContextBlockData;
  const goToExpansion = useArchStore((s) => s.goToExpansion);

  const handleClick = () => goToExpansion(d.contextPath);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const isPrevious = d.direction === "previous";
  const eyebrow = isPrevious ? "← previous block" : "next block →";

  return (
    <>
      {isPrevious ? (
        <Handle id="out" type="source" position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} />
      ) : (
        <Handle id="in" type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKey}
        aria-label={`Open ${d.specNode.label}`}
        title={`Open ${d.specNode.label}`}
        className={clsx(
          styles.card,
          isPrevious ? styles.previous : styles.next,
        )}
      >
        <div className={styles.eyebrow}>{eyebrow}</div>
        <div className={styles.title}>{d.specNode.label}</div>
        {d.specNode.meta && <div className={styles.meta}>{d.specNode.meta}</div>}
      </div>
    </>
  );
}
