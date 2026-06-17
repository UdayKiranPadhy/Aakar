/**
 * Pure: the "Quick Comparison" rows for the Compare Overview tab. Each row is
 * built from real data only — a row is dropped entirely when NEITHER model has
 * a value, and a per-side value is `null` (rendered as an em-dash) when only one
 * side has it. Multimodal/Quantization are asserted ONLY when provable; we never
 * render "No".
 */

import type { ModelInfo } from "../../../domain/modelInfo";
import type { Spec } from "../../../domain/spec";
import { formatParamCount } from "../../components/ui/format";
import { deriveLicense, deriveModality } from "../../components/ui/hubFields";
import { reconcileParamTotal } from "../../model-views/shared/breakdown";
import { summaryNumber } from "./engineering";

export type CompareRow = Readonly<{ label: string; a: string | null; b: string | null }>;

type Slot = Readonly<{ spec: Spec | null; info: ModelInfo | null }>;

function numStr(spec: Spec | null, key: string): string | null {
  if (!spec) return null;
  const v = summaryNumber(spec.config_summary, key);
  return typeof v === "number" ? v.toLocaleString() : null;
}

function visionConfigPresent(spec: Spec | null): boolean {
  const cf = spec?.config_full as Record<string, unknown> | undefined;
  return !!cf && cf.vision_config != null;
}

/** Multimodality, asserted only when provable (vision sub-config or pipeline tag). */
function multimodalLabel(spec: Spec | null, info: ModelInfo | null): string | null {
  const modality = deriveModality(info?.pipeline_tag);
  if (modality) return modality; // "Multimodal" | "Vision" | "Audio"
  if (visionConfigPresent(spec)) return "Yes (Vision)";
  return null;
}

/** "Yes" only when a quantization config exists on either source; never "No". */
function quantLabel(spec: Spec | null, info: ModelInfo | null): string | null {
  const summary = spec ? (spec.config_summary as Record<string, unknown>).quantization_config : undefined;
  const full = spec?.config_full ? (spec.config_full as Record<string, unknown>).quantization_config : undefined;
  const fromInfo = info?.config?.quantization_config;
  return summary || full || fromInfo ? "Yes" : null;
}

function totalLabel(spec: Spec | null, info: ModelInfo | null): string | null {
  if (!spec) return null;
  const introspected = spec.graph[0]?.param_count ?? summaryNumber(spec.config_summary, "total_params") ?? 0;
  const { total } = reconcileParamTotal(introspected, info?.safetensors?.total);
  return total > 0 ? formatParamCount(total) : null;
}

function architecture(spec: Spec | null, info: ModelInfo | null): string | null {
  if (!spec) return null;
  return spec.graph[0]?.module_class ?? info?.config?.architectures?.[0] ?? spec.model_type ?? null;
}

export function quickCompareRows(
  a: Spec | null,
  b: Spec | null,
  infoA: ModelInfo | null,
  infoB: ModelInfo | null,
): ReadonlyArray<CompareRow> {
  const A: Slot = { spec: a, info: infoA };
  const B: Slot = { spec: b, info: infoB };

  const defs: ReadonlyArray<{ label: string; get: (s: Slot) => string | null }> = [
    { label: "Model type", get: (s) => s.info?.config?.model_type ?? s.spec?.model_type ?? null },
    { label: "Architecture", get: (s) => architecture(s.spec, s.info) },
    { label: "Parameters", get: (s) => totalLabel(s.spec, s.info) },
    { label: "Context length", get: (s) => numStr(s.spec, "max_position_embeddings") },
    { label: "Attention", get: (s) => s.spec?.attn_impl ?? null },
    { label: "Position encoding", get: (s) => s.spec?.position_encoding ?? null },
    { label: "Vocab size", get: (s) => numStr(s.spec, "vocab_size") },
    { label: "Multimodal", get: (s) => multimodalLabel(s.spec, s.info) },
    { label: "Quantization", get: (s) => quantLabel(s.spec, s.info) },
    { label: "License", get: (s) => (s.info ? deriveLicense(s.info) : null) },
    { label: "Library", get: (s) => s.info?.library_name ?? null },
  ];

  return defs
    .map((d) => ({ label: d.label, a: d.get(A), b: d.get(B) }))
    .filter((row) => row.a !== null || row.b !== null);
}
