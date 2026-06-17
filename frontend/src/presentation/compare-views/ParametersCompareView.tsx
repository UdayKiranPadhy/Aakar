/**
 * Parameters tab — model-scale (log) strip, a parameter-distribution donut per
 * model, an A-vs-B allocation chart aligned by component role, and the existing
 * per-column breakdown details. All derived from the introspected graph.
 */

import type { Spec } from "../../domain/spec";
import { DonutChart } from "../compare/charts/DonutChart";
import { GroupedBars } from "../compare/charts/GroupedBars";
import { LogScaleBar, type LogScaleItem } from "../compare/charts/LogScaleBar";
import { alignBreakdown } from "../compare/helpers/alignBreakdown";
import { breakdownRows } from "../compare/helpers/archBreakdown";
import { totalParams } from "../compare/helpers/engineering";
import { ArchBreakdownSection } from "../compare/sections/ArchBreakdownSection";
import { CompareSection, DualColumns, ModelCard, type Tone } from "../compare/primitives";
import { formatParamCount } from "../components/ui/format";
import type { CompareViewProps } from "./CompareViewRegistry";
import shared from "./shared.module.css";

function DonutColumn({ spec, tone }: { spec: Spec | null; tone: Tone }) {
  const rows = breakdownRows(spec);
  const total = rows.reduce((sum, r) => sum + r.paramCount, 0);
  const slices = rows.map((r) => ({ id: r.id, label: r.moduleClass ?? r.label, value: r.paramCount }));
  return (
    <ModelCard title={spec?.model_id ?? null} tone={tone}>
      {slices.length === 0 ? (
        <span className={shared.muted}>No parameter data.</span>
      ) : (
        <DonutChart
          slices={slices}
          centerPrimary={formatParamCount(total)}
          centerSecondary="params"
          formatValue={formatParamCount}
          ariaLabel={`Parameter distribution for ${spec?.model_id ?? "model"}`}
        />
      )}
    </ModelCard>
  );
}

export function ParametersCompareView({ a, b }: CompareViewProps) {
  const scaleItems: LogScaleItem[] = [];
  const ta = a ? totalParams(a) : undefined;
  const tb = b ? totalParams(b) : undefined;
  if (a && ta) scaleItems.push({ id: "a", label: a.model_id, value: ta, tone: "a" });
  if (b && tb) scaleItems.push({ id: "b", label: b.model_id, value: tb, tone: "b" });

  const grouped = alignBreakdown(a, b);
  const hasDonut = breakdownRows(a).length > 0 || breakdownRows(b).length > 0;

  return (
    <>
      {scaleItems.length > 0 && (
        <CompareSection id="scale" title="Model scale">
          <LogScaleBar items={scaleItems} />
        </CompareSection>
      )}

      {hasDonut && (
        <CompareSection id="distribution" title="Parameter distribution">
          <DualColumns>
            <DonutColumn spec={a} tone="a" />
            <DonutColumn spec={b} tone="b" />
          </DualColumns>
        </CompareSection>
      )}

      {grouped.length > 0 && (
        <CompareSection id="allocation" title="Parameter allocation (A vs B)">
          <GroupedBars
            rows={grouped}
            seriesALabel={a?.model_id}
            seriesBLabel={b?.model_id}
            formatValue={formatParamCount}
          />
        </CompareSection>
      )}

      <ArchBreakdownSection a={a} b={b} />
    </>
  );
}
