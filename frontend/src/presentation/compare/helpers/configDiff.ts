/**
 * Pure: a flat, generic diff of two models' configs. Flattens each side's
 * `config_full` (falling back to `config_summary`) into dotted paths via the
 * shared `flattenConfig`, then classifies the sorted union of keys. No fixed
 * key list — whatever the introspection returns is compared.
 */

import type { Spec } from "../../../domain/spec";
import { flattenConfig, formatConfigValue } from "../../model-views/config/configGrouping";

export type ConfigDiffStatus = "same" | "changed" | "added" | "removed";

export type ConfigDiffRow = Readonly<{
  path: string;
  /** Formatted value, or null when the key is absent on that side. */
  a: string | null;
  b: string | null;
  status: ConfigDiffStatus;
}>;

function valueMap(spec: Spec | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!spec) return map;
  const source = (spec.config_full ?? spec.config_summary) as Record<string, unknown>;
  for (const leaf of flattenConfig(source)) map.set(leaf.path, formatConfigValue(leaf.value));
  return map;
}

export function configDiff(a: Spec | null, b: Spec | null): ReadonlyArray<ConfigDiffRow> {
  const mapA = valueMap(a);
  const mapB = valueMap(b);
  const paths = [...new Set([...mapA.keys(), ...mapB.keys()])].sort((x, y) => x.localeCompare(y));

  return paths.map((path) => {
    const inA = mapA.has(path);
    const inB = mapB.has(path);
    const av = inA ? mapA.get(path) ?? "" : null;
    const bv = inB ? mapB.get(path) ?? "" : null;

    let status: ConfigDiffStatus;
    if (inA && inB) status = av === bv ? "same" : "changed";
    else if (inA) status = "removed"; // present in A, absent in B
    else status = "added"; // present only in B

    return { path, a: av, b: bv, status };
  });
}
