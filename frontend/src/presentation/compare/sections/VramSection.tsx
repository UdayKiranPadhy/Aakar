/**
 * Live VRAM / KV-cache calculator. Sliders (batch, sequence) and a precision
 * picker drive per-model weights / KV / total. The inputs are lifted to
 * CompareHost so the FLOPs, scaling and formula sections stay in sync.
 */

import type { Spec } from "../../../domain/spec";
import { DTYPE_BYTES } from "../../components/ui/dtypeBytes";
import { formatBytes } from "../../components/ui/format";
import { Pill } from "../../components/ui/Pill";
import { Slider } from "../../components/ui/Slider";
import { vramFor } from "../helpers/engineering";
import { CompareSection, DualColumns, ModelCard, Stat, type Tone } from "../primitives";
import type { CalcInputs } from "../types";
import styles from "./VramSection.module.css";

type Props = {
  a: Spec | null;
  b: Spec | null;
  calc: CalcInputs;
  precision: string;
  seqMax: number;
  setBatch: (n: number) => void;
  setSeq: (n: number) => void;
  setPrecision: (p: string) => void;
};

function isQuantized(spec: Spec): boolean {
  return (spec.config_summary as Record<string, unknown>).quantization_config != null;
}

function Column({ spec, tone, calc }: { spec: Spec | null; tone: Tone; calc: CalcInputs }) {
  if (!spec) {
    return (
      <ModelCard title={null} tone={tone}>
        <span className={styles.muted}>—</span>
      </ModelCard>
    );
  }
  const r = vramFor(spec, { batch: calc.batch, seq: calc.seq, bytesPerElem: calc.bytesFor(spec) });
  return (
    <ModelCard title={spec.model_id} tone={tone} subtitle={spec.param_dtype ?? undefined}>
      <div className={styles.stats}>
        <Stat label="Weights" value={formatBytes(r.weights) ?? "—"} />
        <Stat label="KV cache" value={formatBytes(r.kv) ?? "—"} />
      </div>
      <Stat label="Total VRAM" value={formatBytes(r.total) ?? "—"} accent />
      {isQuantized(spec) && <Pill tone="neutral">quantized — native footprint differs</Pill>}
    </ModelCard>
  );
}

export function VramSection({ a, b, calc, precision, seqMax, setBatch, setSeq, setPrecision }: Props) {
  return (
    <CompareSection id="vram" title="Memory (VRAM) calculator">
      <div className={styles.controls}>
        <Slider label="Batch size" value={calc.batch} min={1} max={64} onChange={setBatch} />
        <Slider
          label="Sequence length"
          value={calc.seq}
          min={64}
          max={Math.max(seqMax, 64)}
          step={64}
          onChange={setSeq}
        />
        <label className={styles.precision}>
          <span className={styles.precisionLabel}>Precision</span>
          <select
            className={styles.select}
            value={precision}
            onChange={(e) => setPrecision(e.target.value)}
          >
            <option value="">Native (per model)</option>
            {Object.keys(DTYPE_BYTES).map((d) => (
              <option key={d} value={d}>
                {d} ({DTYPE_BYTES[d]} B)
              </option>
            ))}
          </select>
        </label>
      </div>

      <DualColumns>
        <Column spec={a} tone="a" calc={calc} />
        <Column spec={b} tone="b" calc={calc} />
      </DualColumns>
    </CompareSection>
  );
}
