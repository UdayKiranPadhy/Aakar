/**
 * Compact one-line strip of Spec-level facts (dtype, attention impl, position
 * encoding, GQA ratio, MoE, etc.). Sits below the breadcrumb so the user has
 * model-wide context while inspecting any block.
 *
 * Each fact is a pill. The strip hides itself entirely if there is nothing
 * worth showing for the current spec.
 */

import { useArchStore } from "../../store/archStore";
import { formatBytes } from "./ui/format";
import styles from "./ModelInfoStrip.module.css";

const _DTYPE_BYTES: Record<string, number> = {
  float32: 4,
  float16: 2,
  bfloat16: 2,
  float64: 8,
  int8: 1,
  uint8: 1,
};

export function ModelInfoStrip() {
  const spec = useArchStore((s) => s.spec);
  if (!spec) return null;

  const summary = spec.config_summary;
  const totalParams = typeof summary.total_params === "number" ? summary.total_params : null;
  const dtypeBytes = _DTYPE_BYTES[spec.param_dtype ?? ""] ?? 4;
  const totalBytes = totalParams ? totalParams * dtypeBytes : null;

  const pills: Array<{ key: string; label: string; value: string }> = [];
  if (spec.param_dtype) pills.push({ key: "dtype", label: "dtype", value: spec.param_dtype });
  if (totalBytes) pills.push({ key: "mem", label: "weights", value: formatBytes(totalBytes) ?? "" });
  if (spec.attn_impl) pills.push({ key: "attn", label: "attn", value: spec.attn_impl });
  if (spec.position_encoding) pills.push({ key: "pos", label: "pos", value: spec.position_encoding });
  if (spec.tied_word_embeddings)
    pills.push({ key: "tied", label: "tied", value: "embeddings" });
  if (typeof summary.gqa_ratio === "number" && summary.gqa_ratio > 1)
    pills.push({ key: "gqa", label: "GQA", value: `${summary.gqa_ratio}:1` });
  if (typeof summary.sliding_window === "number")
    pills.push({ key: "win", label: "window", value: String(summary.sliding_window) });
  if (typeof summary.num_local_experts === "number")
    pills.push({
      key: "moe",
      label: "MoE",
      value: `${summary.num_local_experts}×top-${summary.num_experts_per_tok ?? "?"}`,
    });
  if (summary.quantization_config)
    pills.push({ key: "quant", label: "quantized", value: "yes" });

  if (pills.length === 0) return null;

  return (
    <div className={styles.strip} role="group" aria-label="Model metadata">
      {pills.map((p) => (
        <span key={p.key} className={styles.pill}>
          <span className={styles.pillKey}>{p.label}</span>
          <span className={styles.pillValue}>{p.value}</span>
        </span>
      ))}
    </div>
  );
}
