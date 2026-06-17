/**
 * Parameter-dtype colour palette + safetensors dtype extraction. Colours are
 * mapped to design tokens (not raw hex) so the dtype bar/donut adapts in dark
 * mode like every other surface. Shared by the Overview Parameters card and any
 * Compare dtype visual.
 */

import type { ModelInfo } from "../../../domain/modelInfo";

const DTYPE_COLORS: Record<string, string> = {
  BF16: "var(--g-blue)",
  F16: "var(--g-green)",
  F32: "var(--g-red)",
  F64: "var(--g-yellow-ink)",
  I8: "var(--g-purple)",
  U8: "var(--viz-matrix)",
  I16: "var(--viz-io)",
  I32: "var(--viz-residual)",
  I64: "var(--viz-norm)",
  BOOL: "var(--color-edge)",
};

/** Token-backed colour for a safetensors dtype name; a neutral edge tone for unknowns. */
export function dtypeColor(dtype: string): string {
  return DTYPE_COLORS[dtype.toUpperCase()] ?? "var(--color-edge)";
}

/** Param dtype distribution from safetensors, sorted largest-first; null when unavailable. */
export function dtypeEntries(
  info: ModelInfo,
): { entries: Array<[string, number]>; total: number } | null {
  const params = info.safetensors?.parameters;
  const total = info.safetensors?.total;
  if (!params || !total || total === 0) return null;
  const entries = Object.entries(params).sort(([, a], [, b]) => b - a);
  return entries.length > 0 ? { entries, total } : null;
}
