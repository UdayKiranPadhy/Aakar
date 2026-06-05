/**
 * Focused-stage detail — reuses the model's EXISTING per-block component,
 * `detailRegistry.resolve(node.type)` (the same panel the Architecture view's
 * dock renders, including any custom panel registered later). Synthetic steps
 * (split / add / ids / logits / tied head) have no backing module, so they show
 * a short note instead of fabricating a panel.
 */

import { findNodeByPath } from "../../../domain/navigation";
import type { Spec } from "../../../domain/spec";
import type { JourneyStage } from "../../../domain/tokenJourney";
import { detailRegistry } from "../../details/DetailRegistry";
import styles from "./JourneyView.module.css";

export function StageDetail({
  spec,
  stage,
  onSeeInside,
}: {
  spec: Spec;
  stage: JourneyStage;
  onSeeInside: (stage: JourneyStage) => void;
}) {
  const node = stage.nodePath ? findNodeByPath(spec.graph, stage.nodePath) : null;

  if (!node) {
    return (
      <div className={styles.detailSynthetic}>
        <strong>{stage.label}</strong> — a structural step with no backing{" "}
        <code>nn.Module</code>. {stage.caption}
      </div>
    );
  }

  const Panel = detailRegistry.resolve(node.type);
  return (
    <div className={styles.detail}>
      <Panel node={node} onExpand={() => onSeeInside(stage)} />
    </div>
  );
}
