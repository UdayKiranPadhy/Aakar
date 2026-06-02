/**
 * Parameters — where a model's weights live. A proportional breakdown over the
 * top-level components, the total (preferring the Hub's exact safetensors count
 * over the introspected sum), and the largest individual tensors.
 */

import { useModelInfo } from "../../../application/useModelInfo";
import { formatBytes, formatParamCount, formatShape } from "../../components/ui/format";
import type { ModelViewProps } from "../ModelViewRegistry";
import {
  collectLeafTensors,
  reconcileParamTotal,
  topLevelComponents,
} from "../shared/breakdown";
import { ProportionalBar, ViewEmpty, ViewSection } from "../shared/primitives";
import shared from "../shared/primitives.module.css";
import styles from "./ParametersView.module.css";

const TOP_N = 8;

export function ParametersView({ spec }: ModelViewProps) {
  const { info } = useModelInfo(spec.model_id);
  const root = spec.graph[0];
  const introspected = root?.param_count ?? 0;
  const total = reconcileParamTotal(introspected, info?.safetensors?.total);

  const components = topLevelComponents(spec.graph).filter((c) => (c.param_count ?? 0) > 0);
  const maxComponent = Math.max(0, ...components.map((c) => c.param_count ?? 0));
  const tensors = [...collectLeafTensors(spec.graph)]
    .sort((a, b) => (b.param_count ?? 0) - (a.param_count ?? 0))
    .slice(0, TOP_N);

  if (total.total === 0) {
    return (
      <div className={shared.view}>
        <ViewEmpty message="No parameter data for this model." />
      </div>
    );
  }

  return (
    <div className={shared.view}>
      <div className={styles.totals}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatParamCount(total.total)}</span>
          <span className={styles.statLabel}>Parameters</span>
          <span className={styles.statSub}>{total.total.toLocaleString()}</span>
        </div>
        {root?.memory_bytes != null && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatBytes(root.memory_bytes) ?? "—"}</span>
            <span className={styles.statLabel}>Memory · {spec.param_dtype ?? "fp32"}</span>
          </div>
        )}
        <span className={styles.provenance}>
          {total.source === "safetensors" ? "exact · safetensors" : "introspected estimate"}
        </span>
      </div>

      {components.length > 0 && (
        <ViewSection title="Where the parameters live">
          <div className={shared.barList}>
            {components.map((c) => (
              <ProportionalBar
                key={c.id}
                label={c.module_class ? `${c.label} · ${c.module_class}` : c.label}
                sublabel={formatParamCount(c.param_count ?? 0)}
                value={c.param_count ?? 0}
                max={maxComponent}
              />
            ))}
          </div>
        </ViewSection>
      )}

      {tensors.length > 0 && (
        <ViewSection title={`Largest tensors (top ${tensors.length})`}>
          <dl className={styles.kv}>
            {tensors.map((t) => (
              <div key={t.module_path ?? t.id} className={styles.row}>
                <dt className={styles.key}>{t.module_path ?? t.label}</dt>
                <dd className={styles.val}>
                  {formatShape(t.weight_shape) && (
                    <span className={styles.shape}>{formatShape(t.weight_shape)}</span>
                  )}
                  <span>{formatParamCount(t.param_count ?? 0)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </ViewSection>
      )}
    </div>
  );
}
