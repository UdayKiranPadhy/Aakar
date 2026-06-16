/** Parameter breakdown — each model's top-level components as proportional bars. */

import type { Spec } from "../../../domain/spec";
import { formatBytes, formatParamCount } from "../../components/ui/format";
import { ProportionalBar } from "../../model-views/shared/primitives";
import shared from "../../model-views/shared/primitives.module.css";
import { breakdownRows } from "../helpers/archBreakdown";
import { CompareSection, DualColumns, ModelCard, type Tone } from "../primitives";

function Column({ spec, tone }: { spec: Spec | null; tone: Tone }) {
  const rows = breakdownRows(spec);
  const max = Math.max(0, ...rows.map((r) => r.paramCount));

  return (
    <ModelCard title={spec?.model_id ?? null} tone={tone}>
      {rows.length === 0 ? (
        <span className={shared.stateText}>No parameter data.</span>
      ) : (
        <div className={shared.barList}>
          {rows.map((r) => {
            const bytes = formatBytes(r.memoryBytes);
            const sublabel = `${formatParamCount(r.paramCount)}${bytes ? ` · ${bytes}` : ""} · ${(
              r.pctOfTotal * 100
            ).toFixed(1)}%`;
            return (
              <ProportionalBar
                key={r.id}
                label={r.moduleClass ? `${r.label} · ${r.moduleClass}` : r.label}
                sublabel={sublabel}
                value={r.paramCount}
                max={max}
              />
            );
          })}
        </div>
      )}
    </ModelCard>
  );
}

export function ArchBreakdownSection({ a, b }: { a: Spec | null; b: Spec | null }) {
  return (
    <CompareSection id="architecture" title="Parameter breakdown">
      <DualColumns>
        <Column spec={a} tone="a" />
        <Column spec={b} tone="b" />
      </DualColumns>
    </CompareSection>
  );
}
