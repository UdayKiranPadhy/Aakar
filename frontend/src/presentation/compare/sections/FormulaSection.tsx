/**
 * Formula cards — the equations the calculators use, expandable to show the
 * live substituted values for each loaded model (same inputs as the sections
 * above, so the numbers line up).
 */

import type { Spec } from "../../../domain/spec";
import { formatBytes, formatFlops } from "../../components/ui/format";
import {
  arithmeticIntensity,
  flopsAt,
  headDim,
  kvCacheBytes,
  kvHeads,
  summaryNumber,
  totalParams,
  vramFor,
  weightsBytes,
} from "../helpers/engineering";
import { CompareSection } from "../primitives";
import type { CalcInputs } from "../types";
import styles from "./FormulaSection.module.css";

type Sub = Readonly<{ modelId: string; text: string }>;

function FormulaCard({
  title,
  equation,
  subs,
}: {
  title: string;
  equation: string;
  subs: ReadonlyArray<Sub>;
}) {
  return (
    <details className={styles.card}>
      <summary className={styles.summary}>
        <span className={styles.title}>{title}</span>
        <span className={styles.eq}>{equation}</span>
      </summary>
      <div className={styles.body}>
        {subs.length === 0 ? (
          <span className={styles.muted}>Load a model to see substituted values.</span>
        ) : (
          subs.map((s) => (
            <div key={s.modelId} className={styles.sub}>
              <span className={styles.subModel} title={s.modelId}>
                {s.modelId}
              </span>
              <span className={styles.subText}>{s.text}</span>
            </div>
          ))
        )}
      </div>
    </details>
  );
}

export function FormulaSection({ a, b, calc }: { a: Spec | null; b: Spec | null; calc: CalcInputs }) {
  const loaded = [a, b].filter((s): s is Spec => s !== null);

  const weights: Sub[] = loaded.map((spec) => {
    const p = totalParams(spec);
    const bytes = calc.bytesFor(spec);
    const w = weightsBytes(p, bytes);
    return {
      modelId: spec.model_id,
      text:
        p !== undefined && bytes !== undefined
          ? `${p.toLocaleString()} × ${bytes} B = ${formatBytes(w)}`
          : "—",
    };
  });

  const kv: Sub[] = loaded.map((spec) => {
    const layers = summaryNumber(spec.config_summary, "num_hidden_layers");
    const kvh = kvHeads(spec.config_summary);
    const d = headDim(spec.config_summary);
    const bytes = calc.bytesFor(spec);
    const v = kvCacheBytes({
      numLayers: layers,
      numKvHeads: kvh,
      headDim: d,
      batch: calc.batch,
      seq: calc.seq,
      bytesPerElem: bytes,
    });
    return {
      modelId: spec.model_id,
      text:
        v !== undefined
          ? `2 × ${layers} × ${kvh} × ${d} × ${calc.batch} × ${calc.seq.toLocaleString()} × ${bytes} B = ${formatBytes(v)}`
          : "—",
    };
  });

  const flops: Sub[] = loaded.map((spec) => {
    const f = flopsAt(spec, calc.batch, calc.seq);
    return {
      modelId: spec.model_id,
      text: f !== undefined ? `≈ ${formatFlops(f)} at B=${calc.batch}, S=${calc.seq.toLocaleString()}` : "—",
    };
  });

  const intensity: Sub[] = loaded.map((spec) => {
    const f = flopsAt(spec, calc.batch, calc.seq);
    const total = vramFor(spec, {
      batch: calc.batch,
      seq: calc.seq,
      bytesPerElem: calc.bytesFor(spec),
    }).total;
    const ai = arithmeticIntensity(f, total);
    return {
      modelId: spec.model_id,
      text: ai !== undefined ? `${formatFlops(f)} ÷ ${formatBytes(total)} = ${ai.toFixed(2)} FLOP/byte` : "—",
    };
  });

  return (
    <CompareSection id="formulas" title="Formulas">
      <div className={styles.list}>
        <FormulaCard title="Weights footprint" equation="Parameters × BytesPerElem" subs={weights} />
        <FormulaCard
          title="KV cache"
          equation="2 × Layers × KV-heads × HeadDim × Batch × Seq × BytesPerElem"
          subs={kv}
        />
        <FormulaCard title="Forward FLOPs" equation="Σ(layer FLOPs) scaled to Batch × Seq" subs={flops} />
        <FormulaCard
          title="Arithmetic intensity"
          equation="Forward FLOPs ÷ Bytes moved (weights + KV)"
          subs={intensity}
        />
      </div>
    </CompareSection>
  );
}
