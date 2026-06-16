/**
 * Memory-scaling chart — total VRAM (weights + KV) vs sequence length, one
 * hand-rolled SVG polyline per model. Axis range is derived from the data; no
 * fixed hardware threshold lines.
 */

import type { Spec } from "../../../domain/spec";
import { formatBytes } from "../../components/ui/format";
import { ViewEmpty } from "../../model-views/shared/primitives";
import { memoryScalingSeries } from "../helpers/memoryScaling";
import { CompareSection } from "../primitives";
import type { CalcInputs } from "../types";
import styles from "./MemoryScalingSection.module.css";

const W = 520;
const H = 240;
const PAD_L = 70;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 34;
const TICKS = 4;

export function MemoryScalingSection({
  a,
  b,
  calc,
}: {
  a: Spec | null;
  b: Spec | null;
  calc: CalcInputs;
}) {
  const specs = [a, b].filter((s): s is Spec => s !== null);
  const { series, seqMax, bytesMax, omitted } = memoryScalingSeries(specs, {
    batch: calc.batch,
    bytesPerElem: calc.bytesFor,
    steps: 24,
  });

  const colorFor = (modelId: string): string => {
    if (b && modelId === b.model_id && !(a && modelId === a.model_id)) return "var(--g-green)";
    return "var(--color-accent)";
  };

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (seq: number) => PAD_L + (seqMax > 0 ? seq / seqMax : 0) * plotW;
  const y = (bytes: number) => PAD_T + plotH - (bytesMax > 0 ? bytes / bytesMax : 0) * plotH;

  return (
    <CompareSection id="scaling" title="Memory scaling vs context length">
      {series.length === 0 ? (
        <ViewEmpty message="Load a model with attention config to chart memory scaling." />
      ) : (
        <div className={styles.box}>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Total VRAM versus sequence length"
          >
            {Array.from({ length: TICKS + 1 }, (_, i) => {
              const value = (bytesMax * i) / TICKS;
              const yy = y(value);
              return (
                <g key={`y${i}`}>
                  <line className={styles.grid} x1={PAD_L} y1={yy} x2={W - PAD_R} y2={yy} />
                  <text className={styles.axis} x={PAD_L - 6} y={yy + 3} textAnchor="end">
                    {formatBytes(value) ?? "0"}
                  </text>
                </g>
              );
            })}
            {Array.from({ length: TICKS + 1 }, (_, i) => {
              const seq = (seqMax * i) / TICKS;
              return (
                <text
                  key={`x${i}`}
                  className={styles.axis}
                  x={x(seq)}
                  y={H - PAD_B + 16}
                  textAnchor="middle"
                >
                  {Math.round(seq).toLocaleString()}
                </text>
              );
            })}
            {series.map((s) => (
              <polyline
                key={s.modelId}
                className={styles.line}
                stroke={colorFor(s.modelId)}
                points={s.points.map((p) => `${x(p.seq).toFixed(1)},${y(p.bytes).toFixed(1)}`).join(" ")}
              />
            ))}
          </svg>

          <div className={styles.legend}>
            {series.map((s) => (
              <span key={s.modelId} className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: colorFor(s.modelId) }} />
                <span className={styles.legendLabel} title={s.modelId}>
                  {s.modelId}
                </span>
              </span>
            ))}
          </div>

          <p className={styles.note}>
            Total VRAM (weights + KV cache) at batch {calc.batch}, swept to the largest declared context
            window
            {omitted > 0 ? ` · ${omitted} model(s) omitted (insufficient config)` : ""}.
          </p>
        </div>
      )}
    </CompareSection>
  );
}
