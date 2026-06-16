/**
 * Forward FLOPs (introspected, scaled to the current batch×seq) and arithmetic
 * intensity (FLOPs ÷ bytes moved). No absolute hardware verdict — we tag the
 * lower-intensity model as the more memory-bound of the two.
 */

import type { Spec } from "../../../domain/spec";
import { formatFlops } from "../../components/ui/format";
import { Pill } from "../../components/ui/Pill";
import { arithmeticIntensity, flopsAt, vramFor } from "../helpers/engineering";
import { CompareSection, DualColumns, ModelCard, Stat, type Tone } from "../primitives";
import type { CalcInputs } from "../types";
import styles from "./FlopsSection.module.css";

type ColData = Readonly<{ flops?: number; intensity?: number }>;

function compute(spec: Spec | null, calc: CalcInputs): ColData {
  if (!spec) return {};
  const flops = flopsAt(spec, calc.batch, calc.seq);
  const total = vramFor(spec, { batch: calc.batch, seq: calc.seq, bytesPerElem: calc.bytesFor(spec) }).total;
  return { flops, intensity: arithmeticIntensity(flops, total) };
}

function Column({
  spec,
  tone,
  data,
  memoryBound,
}: {
  spec: Spec | null;
  tone: Tone;
  data: ColData;
  memoryBound: boolean;
}) {
  return (
    <ModelCard title={spec?.model_id ?? null} tone={tone}>
      <div className={styles.stats}>
        <Stat label="Forward FLOPs" value={formatFlops(data.flops) ?? "—"} />
        <Stat
          label="Arithmetic intensity"
          value={data.intensity === undefined ? "—" : `${data.intensity.toFixed(2)} FLOP/byte`}
        />
      </div>
      {memoryBound && <Pill tone="neutral">more memory-bound</Pill>}
    </ModelCard>
  );
}

export function FlopsSection({ a, b, calc }: { a: Spec | null; b: Spec | null; calc: CalcInputs }) {
  const dataA = compute(a, calc);
  const dataB = compute(b, calc);
  const lower =
    dataA.intensity !== undefined && dataB.intensity !== undefined
      ? dataA.intensity <= dataB.intensity
        ? "a"
        : "b"
      : null;

  return (
    <CompareSection id="flops" title="FLOPs & arithmetic intensity">
      <p className={styles.note}>
        Forward FLOPs are introspected (Linear + normalization layers) and scaled to B={calc.batch}, S=
        {calc.seq.toLocaleString()}. Arithmetic intensity = FLOPs ÷ bytes moved (weights + KV); lower
        intensity tends toward memory-bandwidth-bound execution.
      </p>
      <DualColumns>
        <Column spec={a} tone="a" data={dataA} memoryBound={lower === "a"} />
        <Column spec={b} tone="b" data={dataB} memoryBound={lower === "b"} />
      </DualColumns>
    </CompareSection>
  );
}
