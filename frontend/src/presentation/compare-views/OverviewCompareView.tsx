/**
 * Overview tab — the headline comparison: an identity card per model (badges,
 * README lead, Hub stats), a Quick Comparison table, a parameter-distribution
 * donut per model, an auto-derived Key Differences list, and — only when a model
 * card actually carries a `model-index` — a reported-evaluations table. Every
 * field renders only when its source value exists.
 */

import { useModelInfo, type ModelInfoState } from "../../application/useModelInfo";
import type { ModelInfo } from "../../domain/modelInfo";
import type { Spec } from "../../domain/spec";
import { DonutChart } from "../compare/charts/DonutChart";
import { breakdownRows } from "../compare/helpers/archBreakdown";
import { summaryNumber } from "../compare/helpers/engineering";
import { keyDifferences } from "../compare/helpers/keyDifferences";
import { type CompareRow, quickCompareRows } from "../compare/helpers/overviewCompare";
import { CompareSection, DualColumns, ModelCard, Stat, type Tone } from "../compare/primitives";
import { formatBytes, formatCompact, formatDate, formatParamCount } from "../components/ui/format";
import { deriveLicense, deriveModality, extractReadmeSummary, prettyWords } from "../components/ui/hubFields";
import { type ModelIndexMetric, modelIndexMetrics } from "../components/ui/modelIndex";
import { reconcileParamTotal } from "../model-views/shared/breakdown";
import { ViewLoading } from "../model-views/shared/primitives";
import type { CompareViewProps } from "./CompareViewRegistry";
import shared from "./shared.module.css";
import styles from "./OverviewCompareView.module.css";

function Badges({ info }: { info: ModelInfo }) {
  const badges: string[] = [];
  const modality = deriveModality(info.pipeline_tag);
  if (modality) badges.push(modality);
  if (info.library_name) badges.push(prettyWords(info.library_name));
  if (info.pipeline_tag) badges.push(info.pipeline_tag);
  const license = deriveLicense(info);
  if (license) badges.push(license);
  if (badges.length === 0) return null;
  return (
    <div className={styles.badges}>
      {badges.map((b) => (
        <span key={b} className={styles.badge}>
          {b}
        </span>
      ))}
    </div>
  );
}

function totalParamsFor(spec: Spec, info: ModelInfo | null): number | null {
  const introspected = spec.graph[0]?.param_count ?? summaryNumber(spec.config_summary, "total_params") ?? 0;
  const { total } = reconcileParamTotal(introspected, info?.safetensors?.total);
  return total > 0 ? total : null;
}

function IdentityColumn({ spec, state, tone }: { spec: Spec | null; state: ModelInfoState; tone: Tone }) {
  if (!spec) {
    return (
      <ModelCard title={null} tone={tone}>
        <span className={shared.muted}>Enter a model above to compare.</span>
      </ModelCard>
    );
  }
  const info = state.info;
  const lead = extractReadmeSummary(state.readme).lead;
  const stats: Array<{ key: string; label: string; value: string }> = [];
  if (info) {
    if (typeof info.downloads === "number") stats.push({ key: "dl", label: "Downloads", value: formatCompact(info.downloads) });
    if (typeof info.likes === "number") stats.push({ key: "likes", label: "Likes", value: formatCompact(info.likes) });
    const params = totalParamsFor(spec, info);
    if (params !== null) stats.push({ key: "p", label: "Parameters", value: formatParamCount(params) });
    const storage = formatBytes(info.used_storage);
    if (storage) stats.push({ key: "s", label: "Storage", value: storage });
    const updated = formatDate(info.last_modified);
    if (updated) stats.push({ key: "u", label: "Updated", value: updated });
  }

  return (
    <ModelCard title={spec.model_id} tone={tone}>
      {state.loading && <ViewLoading label="Loading model card…" />}
      {info && <Badges info={info} />}
      {lead && <p className={styles.lead}>{lead}</p>}
      {stats.length > 0 && (
        <div className={styles.stats}>
          {stats.map((s) => (
            <Stat key={s.key} label={s.label} value={s.value} />
          ))}
        </div>
      )}
      {!state.loading && !info && <span className={shared.muted}>No Hub metadata available.</span>}
    </ModelCard>
  );
}

function QuickTable({ a, b, rows }: { a: Spec | null; b: Spec | null; rows: ReadonlyArray<CompareRow> }) {
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.featureHead}>Feature</th>
            <th className={styles.colHead} title={a?.model_id}>
              {a?.model_id ?? "Model A"}
            </th>
            <th className={styles.colHead} title={b?.model_id}>
              {b?.model_id ?? "Model B"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className={styles.feature}>
                {r.label}
              </th>
              <td className={styles.value}>{r.a ?? "—"}</td>
              <td className={styles.value}>{r.b ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DistributionColumn({ spec, tone }: { spec: Spec | null; tone: Tone }) {
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
        />
      )}
    </ModelCard>
  );
}

function EvalColumn({ spec, metrics, tone }: { spec: Spec | null; metrics: ReadonlyArray<ModelIndexMetric>; tone: Tone }) {
  if (!spec) {
    return (
      <ModelCard title={null} tone={tone}>
        <span className={shared.muted}>—</span>
      </ModelCard>
    );
  }
  return (
    <ModelCard title={spec.model_id} tone={tone}>
      {metrics.length === 0 ? (
        <span className={shared.muted}>No reported evaluations.</span>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.featureHead}>Benchmark</th>
              <th className={styles.colHead}>Score</th>
            </tr>
          </thead>
          <tbody>
            {metrics.slice(0, 24).map((m, i) => (
              <tr key={`${m.metricName}-${m.dataset ?? ""}-${i}`}>
                <th scope="row" className={styles.feature}>
                  {m.dataset ? `${m.dataset} · ${m.metricName}` : m.metricName}
                </th>
                <td className={styles.value}>
                  {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModelCard>
  );
}

export function OverviewCompareView({ a, b }: CompareViewProps) {
  const infoA = useModelInfo(a?.model_id);
  const infoB = useModelInfo(b?.model_id);
  const rows = quickCompareRows(a, b, infoA.info, infoB.info);
  const diffs = keyDifferences(a, b);
  const evalA = modelIndexMetrics(infoA.info?.card_data);
  const evalB = modelIndexMetrics(infoB.info?.card_data);
  const hasDonut = breakdownRows(a).length > 0 || breakdownRows(b).length > 0;
  const hasEvals = evalA.length > 0 || evalB.length > 0;

  return (
    <>
      <CompareSection id="identity" title="Models">
        <DualColumns>
          <IdentityColumn spec={a} state={infoA} tone="a" />
          <IdentityColumn spec={b} state={infoB} tone="b" />
        </DualColumns>
      </CompareSection>

      {rows.length > 0 && (
        <CompareSection id="quick" title="Quick comparison">
          <QuickTable a={a} b={b} rows={rows} />
        </CompareSection>
      )}

      {hasDonut && (
        <CompareSection id="distribution" title="Parameter distribution">
          <DualColumns>
            <DistributionColumn spec={a} tone="a" />
            <DistributionColumn spec={b} tone="b" />
          </DualColumns>
        </CompareSection>
      )}

      {diffs.length > 0 && (
        <CompareSection id="differences" title="Key differences">
          <ul className={shared.bullets}>
            {diffs.map((d) => (
              <li key={`${d.label}-${d.text}`} className={shared.bullet}>
                <span className={shared.bulletLabel}>{d.label}</span>
                <span>{d.text}</span>
              </li>
            ))}
          </ul>
        </CompareSection>
      )}

      {hasEvals && (
        <CompareSection id="evals" title="Reported evaluations (from model card)">
          <DualColumns>
            <EvalColumn spec={a} metrics={evalA} tone="a" />
            <EvalColumn spec={b} metrics={evalB} tone="b" />
          </DualColumns>
        </CompareSection>
      )}
    </>
  );
}
