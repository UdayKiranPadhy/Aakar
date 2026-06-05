/**
 * Cost overlay for the focused stage. Resolves the backing Node by path and shows
 * its parameter count + forward FLOPs (rescaled to the Batch/Seq sliders via the
 * shared `scaleFlops`/`sumFlops`), plus the attention score-matrix element count,
 * which grows as S² — the headline cost lesson of sequence length.
 */

import { findNodeByPath } from "../../../domain/navigation";
import type { JourneyStage } from "../../../domain/tokenJourney";
import type { Spec } from "../../../domain/spec";
import { formatFlops, formatParamCount } from "../../components/ui/format";
import { scaleFlops, sumFlops } from "../shared/breakdown";
import styles from "./JourneyView.module.css";

function numOf(summary: Spec["config_summary"], key: string): number | null {
  const v = summary[key];
  return typeof v === "number" ? v : null;
}

function fmtCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

export function CostStrip({
  spec,
  stage,
  batch,
  seq,
}: {
  spec: Spec;
  stage: JourneyStage;
  batch: number;
  seq: number;
}) {
  const ref = spec.flops_reference ?? { batch_size: 1, seq_len: 2048 };
  const node = stage.nodePath ? findNodeByPath(spec.graph, stage.nodePath) : null;
  const flops = node ? scaleFlops(sumFlops(node), ref, { batch, seq }) : 0;
  const heads = numOf(spec.config_summary, "num_attention_heads") ?? 0;
  const scoreElts = batch * heads * seq * seq;

  return (
    <div className={styles.strip}>
      <span className={styles.stripLabel}>
        Cost · B={batch} S={seq}
      </span>
      <span className={styles.costMain}>
        {node ? (
          <>
            <strong>{formatParamCount(node.param_count ?? 0)}</strong> params ·{" "}
            <strong>{formatFlops(flops) ?? "0 F"}</strong> / fwd
          </>
        ) : (
          <span className={styles.dimMuted}>structural step — no learned params</span>
        )}
      </span>
      {heads > 0 && (
        <span className={styles.costAttn}>
          attention scores ≈ <strong>{fmtCount(scoreElts)}</strong> · ∝ S²
        </span>
      )}
    </div>
  );
}
