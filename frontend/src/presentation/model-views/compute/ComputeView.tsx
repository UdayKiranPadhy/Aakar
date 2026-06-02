/**
 * Compute — theoretical forward-pass FLOPs, with batch/sequence sliders that
 * rescale the numbers live. Honest about coverage: only Linear + norm layers
 * carry FLOPs today, so the attention score term is excluded (a lower bound).
 */

import { useMemo, useState } from "react";

import { formatFlops } from "../../components/ui/format";
import type { ModelViewProps } from "../ModelViewRegistry";
import { scaleFlops, sumFlops, topLevelComponents } from "../shared/breakdown";
import { ProportionalBar, ViewEmpty, ViewSection } from "../shared/primitives";
import shared from "../shared/primitives.module.css";
import styles from "./ComputeView.module.css";

export function ComputeView({ spec }: ModelViewProps) {
  const ref = spec.flops_reference ?? { batch_size: 1, seq_len: 2048 };
  const [batch, setBatch] = useState(ref.batch_size);
  const [seq, setSeq] = useState(ref.seq_len);

  const atRef = useMemo(
    () =>
      topLevelComponents(spec.graph)
        .map((c) => ({ id: c.id, label: c.label, moduleClass: c.module_class, flops: sumFlops(c) }))
        .filter((c) => c.flops > 0),
    [spec.graph],
  );

  const scaled = atRef.map((c) => ({ ...c, flops: scaleFlops(c.flops, ref, { batch, seq }) }));
  const total = scaled.reduce((acc, c) => acc + c.flops, 0);
  const maxComponent = Math.max(0, ...scaled.map((c) => c.flops));

  if (atRef.length === 0) {
    return (
      <div className={shared.view}>
        <ViewEmpty message="FLOPs aren’t available for this architecture yet — only Linear and normalization layers are counted." />
      </div>
    );
  }

  return (
    <div className={shared.view}>
      <p className={styles.banner}>
        Theoretical forward-pass FLOPs. Counts matrix-multiplies in Linear layers and
        normalization ops; excludes activations, softmax, and (for now) the attention
        score matrix — so this is a lower bound that scales linearly with tokens.
      </p>

      <div className={styles.controls}>
        <Slider label="Batch size" value={batch} min={1} max={64} onChange={setBatch} />
        <Slider label="Sequence length" value={seq} min={1} max={8192} step={64} onChange={setSeq} />
      </div>

      <div className={styles.total}>
        <span className={styles.totalValue}>{formatFlops(total)}</span>
        <span className={styles.totalLabel}>
          per forward pass · B={batch}, S={seq}
        </span>
      </div>

      <ViewSection title="By component">
        <div className={shared.barList}>
          {scaled.map((c) => (
            <ProportionalBar
              key={c.id}
              label={c.moduleClass ? `${c.label} · ${c.moduleClass}` : c.label}
              sublabel={formatFlops(c.flops) ?? "—"}
              value={c.flops}
              max={maxComponent}
            />
          ))}
        </div>
      </ViewSection>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className={styles.slider}>
      <span className={styles.sliderLabel}>
        {label}
        <strong className={styles.sliderValue}>{value}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
