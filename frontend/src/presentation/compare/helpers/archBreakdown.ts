/**
 * Pure: the top-level parameter breakdown for one spec, as proportional rows.
 * Reuses `topLevelComponents` (generic — keys off param share, never family
 * names) and adds each row's share of the model total.
 */

import type { Spec } from "../../../domain/spec";
import { topLevelComponents } from "../../model-views/shared/breakdown";

export type BreakdownRow = Readonly<{
  id: string;
  label: string;
  moduleClass?: string;
  role?: string;
  paramCount: number;
  memoryBytes?: number;
  /** Fraction of the model's total parameters (0..1); 0 when the total is unknown. */
  pctOfTotal: number;
}>;

export function breakdownRows(spec: Spec | null): ReadonlyArray<BreakdownRow> {
  if (!spec) return [];
  const total = spec.graph[0]?.param_count ?? 0;

  return topLevelComponents(spec.graph)
    .filter((c) => (c.param_count ?? 0) > 0)
    .map((c) => {
      const paramCount = c.param_count ?? 0;
      return {
        id: c.id,
        label: c.label,
        moduleClass: c.module_class,
        role: c.role,
        paramCount,
        memoryBytes: c.memory_bytes,
        pctOfTotal: total > 0 ? paramCount / total : 0,
      };
    });
}
