/**
 * Pure: line two specs' headline metrics up into diff rows. Reuses the existing
 * `specMetrics` field list (same labels, same order for any spec), so column A
 * and B always align row-for-row. A missing side renders an em-dash and never
 * counts as a difference.
 */

import type { Spec } from "../../../domain/spec";
import { specMetrics } from "../specMetrics";

export type SpecDiffRow = Readonly<{
  label: string;
  a: string;
  b: string;
  differs: boolean;
}>;

const DASH = "—";

export function specDiffRows(a: Spec | null, b: Spec | null): ReadonlyArray<SpecDiffRow> {
  const metricsA = a ? specMetrics(a) : null;
  const metricsB = b ? specMetrics(b) : null;
  const template = metricsA ?? metricsB;
  if (!template) return [];

  return template.map((metric, i) => {
    const av = metricsA?.[i]?.value ?? DASH;
    const bv = metricsB?.[i]?.value ?? DASH;
    const differs = metricsA != null && metricsB != null && av !== bv;
    return { label: metric.label, a: av, b: bv, differs };
  });
}
