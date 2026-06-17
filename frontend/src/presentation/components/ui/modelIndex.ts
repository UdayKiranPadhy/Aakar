/**
 * Defensive parser for the HuggingFace model-card `model-index` standard — the
 * one real source of benchmark/eval numbers in Aakar. The field is open-ended
 * (`card_data["model-index"]`), so every access is guarded and anything
 * malformed is skipped. Returns `[]` when absent or unparseable, so callers
 * simply omit the section. NEVER fabricates a metric.
 *
 * Shape (per the HF spec):
 *   model-index: [{ name, results: [{ task:{type,name}, dataset:{type,name},
 *                   metrics: [{ type, name, value, verified }] }] }]
 */

export type ModelIndexMetric = Readonly<{
  modelName?: string;
  task?: string;
  taskType?: string;
  dataset?: string;
  datasetType?: string;
  metricName: string;
  metricType?: string;
  value: number | string;
  verified?: boolean;
}>;

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(obj: Record<string, unknown> | null, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

export function modelIndexMetrics(
  cardData: Readonly<Record<string, unknown>> | undefined | null,
): ReadonlyArray<ModelIndexMetric> {
  const root = asRecord(cardData);
  if (!root) return [];
  const index = root["model-index"];
  if (!Array.isArray(index)) return [];

  const out: ModelIndexMetric[] = [];
  for (const entryRaw of index) {
    const entry = asRecord(entryRaw);
    if (!entry) continue;
    const modelName = str(entry, "name");
    const results = entry["results"];
    if (!Array.isArray(results)) continue;

    for (const resultRaw of results) {
      const result = asRecord(resultRaw);
      if (!result) continue;
      const task = asRecord(result["task"]);
      const dataset = asRecord(result["dataset"]);
      const metrics = result["metrics"];
      if (!Array.isArray(metrics)) continue;

      const taskType = str(task, "type");
      const taskName = str(task, "name");
      const datasetType = str(dataset, "type");
      const datasetName = str(dataset, "name");

      for (const metricRaw of metrics) {
        const metric = asRecord(metricRaw);
        if (!metric) continue;
        const value = metric["value"];
        if (typeof value !== "number" && typeof value !== "string") continue;
        const metricName = str(metric, "name") ?? str(metric, "type");
        if (!metricName) continue;
        const verified = metric["verified"];
        out.push({
          modelName,
          task: taskName,
          taskType,
          dataset: datasetName,
          datasetType,
          metricName,
          metricType: str(metric, "type"),
          value,
          verified: typeof verified === "boolean" ? verified : undefined,
        });
      }
    }
  }
  return out;
}
