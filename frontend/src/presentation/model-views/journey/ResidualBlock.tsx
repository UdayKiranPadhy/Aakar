/**
 * One decoder sub-layer drawn as TWO PARALLEL PATHS: a skip path (identity, top
 * lane, with its own flowing token) running alongside a transform path
 * (norm → sub-layer, below). The stream forks at the `●` split and the two lanes
 * merge at the `⊕` add — making it explicit what the residual is added to.
 */

import { Fragment, type RefCallback } from "react";
import { clsx } from "clsx";

import type { Spec } from "../../../domain/spec";
import type { JourneyStage, ResidualBlock as ResidualBlockData } from "../../../domain/tokenJourney";
import { JourneyConnector } from "./JourneyConnector";
import { JourneyRailCard } from "./JourneyRailCard";
import styles from "./JourneyView.module.css";

function RoundNode({
  stage,
  active,
  register,
  onFocus,
}: {
  stage: JourneyStage;
  active: boolean;
  register: RefCallback<HTMLElement>;
  onFocus: (stage: JourneyStage) => void;
}) {
  const split = stage.kind === "split";
  return (
    <button
      type="button"
      ref={register as RefCallback<HTMLButtonElement>}
      className={clsx(styles.round, split ? styles.roundSplit : styles.roundAdd, active && styles.roundActive)}
      onClick={() => onFocus(stage)}
      title={stage.caption}
    >
      <span aria-hidden="true">{split ? "●" : "⊕"}</span>
      <span className={styles.roundLabel}>{stage.label}</span>
    </button>
  );
}

export function ResidualBlock({
  spec,
  block,
  activeId,
  registerStop,
  onFocus,
  onSeeInside,
}: {
  spec: Spec;
  block: ResidualBlockData;
  activeId: string | null;
  registerStop: (id: string) => RefCallback<HTMLElement>;
  onFocus: (stage: JourneyStage) => void;
  onSeeInside: (stage: JourneyStage) => void;
}) {
  return (
    <div className={styles.resblock}>
      <div className={styles.skipLane}>
        <span className={styles.skipTag}>skip · identity</span>
        <i className={styles.skipDot} aria-hidden="true" />
      </div>
      <span className={styles.forkL} aria-hidden="true" />
      <span className={styles.forkR} aria-hidden="true" />

      <div className={styles.xformRow}>
        <RoundNode
          stage={block.split}
          active={activeId === block.split.id}
          register={registerStop(block.split.id)}
          onFocus={onFocus}
        />
        {block.branch.map((s) => (
          <Fragment key={s.id}>
            <JourneyConnector shape={s.inputShape} />
            <JourneyRailCard
              spec={spec}
              stage={s}
              active={activeId === s.id}
              register={registerStop(s.id)}
              onFocus={onFocus}
              onSeeInside={onSeeInside}
            />
          </Fragment>
        ))}
        <JourneyConnector shape={block.add.inputShape} />
        <RoundNode
          stage={block.add}
          active={activeId === block.add.id}
          register={registerStop(block.add.id)}
          onFocus={onFocus}
        />
      </div>
    </div>
  );
}
