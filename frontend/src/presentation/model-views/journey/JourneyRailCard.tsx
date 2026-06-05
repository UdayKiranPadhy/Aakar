/**
 * A stop on the rail. For a real module it reuses the canvas's block renderer
 * (`blockRegistry.resolve(node)`) so the rail reads exactly like the diagram and
 * future custom renderers light up here for free. Synthetic stages (ids / logits /
 * positional / tied head) render as a compact glyph. Clicking focuses the stage;
 * the block card's own "Expand internals ↗" pill deep-links into the Architecture view.
 */

import { type RefCallback } from "react";
import { clsx } from "clsx";

import { findNodeByPath } from "../../../domain/navigation";
import type { Spec } from "../../../domain/spec";
import type { JourneyStage } from "../../../domain/tokenJourney";
import { blockRegistry } from "../../blocks/BlockRegistry";
import { KIND_TONE } from "./tones";
import styles from "./JourneyView.module.css";

export function JourneyRailCard({
  spec,
  stage,
  active,
  register,
  onFocus,
  onSeeInside,
}: {
  spec: Spec;
  stage: JourneyStage;
  active: boolean;
  register: RefCallback<HTMLElement>;
  onFocus: (stage: JourneyStage) => void;
  onSeeInside: (stage: JourneyStage) => void;
}) {
  const tone = KIND_TONE[stage.kind];
  const node = stage.nodePath ? findNodeByPath(spec.graph, stage.nodePath) : null;

  if (node) {
    const Block = blockRegistry.resolve(node);
    return (
      <div
        ref={register}
        data-tone={tone}
        className={clsx(styles.railCard, active && styles.railCardActive)}
      >
        {/* Journey-derived badges (GQA / RoPE / MoE / tied) — the reused block card
            doesn't render these, so overlay them at the card's top-right. */}
        {stage.badges && stage.badges.length > 0 && (
          <div className={styles.cardBadges}>
            {stage.badges.map((b) => (
              <span key={b} className={styles.badge}>
                {b}
              </span>
            ))}
          </div>
        )}
        <Block
          node={node}
          level={2}
          selected={active}
          visualTone={tone}
          onSelect={() => onFocus(stage)}
          onExpand={() => onSeeInside(stage)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      ref={register as RefCallback<HTMLButtonElement>}
      data-tone={tone}
      className={clsx(styles.glyph, active && styles.glyphActive)}
      onClick={() => onFocus(stage)}
      title={stage.caption}
    >
      <span className={styles.glyphKind}>{stage.kind.replace(/-/g, " ")}</span>
      <span className={styles.glyphLabel}>{stage.label}</span>
      {stage.outputShape && <span className={styles.glyphShape}>{stage.outputShape}</span>}
      {stage.badges && stage.badges.length > 0 && (
        <span className={styles.glyphBadges}>
          {stage.badges.map((b) => (
            <span key={b} className={styles.badge}>
              {b}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
