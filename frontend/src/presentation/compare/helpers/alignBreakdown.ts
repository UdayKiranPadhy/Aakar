/**
 * Pure: align two models' parameter breakdowns into shared A-vs-B rows for the
 * GroupedBars chart. Components are aligned by a generic category derived from
 * the backend's fact-based `role` (never family names), so the same category is
 * compared across both models. A category present in only one model leaves the
 * other series `undefined` (rendered as an empty bar).
 */

import type { Spec } from "../../../domain/spec";
import type { GroupedBarRow } from "../charts/GroupedBars";
import { formatParamCount } from "../../components/ui/format";
import { type BreakdownRow, breakdownRows } from "./archBreakdown";

const CATEGORY_ORDER: ReadonlyArray<string> = [
  "Embedding",
  "Decoder layers",
  "Attention",
  "MLP",
  "MoE",
  "Normalization",
  "Output head",
];

function categoryOf(row: BreakdownRow): string {
  switch (row.role) {
    case "token_embedding":
    case "position_embedding":
    case "embedding":
      return "Embedding";
    case "attention":
      return "Attention";
    case "mlp":
      return "MLP";
    case "moe":
      return "MoE";
    case "lm_head":
      return "Output head";
    case "norm":
      return "Normalization";
    case "layer_stack":
      return "Decoder layers";
    default:
      return row.moduleClass ?? row.label;
  }
}

function accumulate(rows: ReadonlyArray<BreakdownRow>): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const cat = categoryOf(r);
    m.set(cat, (m.get(cat) ?? 0) + r.paramCount);
  }
  return m;
}

function orderedUnion(a: ReadonlyArray<string>, b: ReadonlyArray<string>): string[] {
  return [...new Set([...a, ...b])].sort((x, y) => {
    const ix = CATEGORY_ORDER.indexOf(x);
    const iy = CATEGORY_ORDER.indexOf(y);
    if (ix === -1 && iy === -1) return x.localeCompare(y);
    if (ix === -1) return 1;
    if (iy === -1) return -1;
    return ix - iy;
  });
}

export function alignBreakdown(a: Spec | null, b: Spec | null): ReadonlyArray<GroupedBarRow> {
  const am = accumulate(breakdownRows(a));
  const bm = accumulate(breakdownRows(b));
  return orderedUnion([...am.keys()], [...bm.keys()]).map((cat) => ({
    label: cat,
    a: am.has(cat) ? am.get(cat) : undefined,
    b: bm.has(cat) ? bm.get(cat) : undefined,
    aText: am.has(cat) ? formatParamCount(am.get(cat)!) : undefined,
    bText: bm.has(cat) ? formatParamCount(bm.get(cat)!) : undefined,
  }));
}
