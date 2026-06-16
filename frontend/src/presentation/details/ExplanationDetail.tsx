/**
 * Detail panel for clickable nodes that aren't real `nn.Module`s — the traced
 * op glyphs (`type: "operation"`) and the hand-authored semantic glyphs
 * (Q heads / Scores / Softmax / …). Answers the "what is this and why is it
 * here?" question the canvas now lets you ask of every node.
 *
 * Reached via the flow-node selection channel and resolved by the DetailRegistry
 * on the synthetic node's `type` (see `register.ts`).
 */

import type { CSSProperties } from "react";

import type { DetailPanelProps } from "./DetailRegistry";
import { explainFlowNode } from "./explanations";
import { opCategoryTone } from "../components/ui/opCategoryTone";
import styles from "./ExplanationDetail.module.css";

export function ExplanationDetail({ node, onClose }: DetailPanelProps) {
  const ex = explainFlowNode(node);
  const category =
    typeof node.params.category === "string" ? node.params.category : undefined;
  const opName = typeof node.params.op === "string" ? node.params.op : undefined;
  const tone = opCategoryTone(category ?? "other");
  const vars = { "--cat": tone.color, "--cat-bg": tone.bg } as CSSProperties;

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <div className={styles.title}>{ex.title}</div>
          {(category || opName) && (
            <div className={styles.tags} style={vars}>
              {category && <span className={styles.badge}>{category}</span>}
              {opName && <span className={styles.op}>{opName}</span>}
            </div>
          )}
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
        <p className={styles.what}>{ex.what}</p>
        {ex.why && <p className={styles.why}>{ex.why}</p>}

        {node.meta && (
          <dl className={styles.shapeRow}>
            <dt>output</dt>
            <dd>{node.meta}</dd>
          </dl>
        )}

        <p className={styles.note}>
          This is a computed step in the forward pass, not a learnable module —
          there's nothing to expand into.
        </p>
      </div>
    </div>
  );
}
