import { describe, expect, it } from "vitest";

import { modelIndexMetrics } from "./modelIndex";

describe("modelIndexMetrics", () => {
  it("returns [] when card_data is missing or has no usable model-index", () => {
    expect(modelIndexMetrics(undefined)).toEqual([]);
    expect(modelIndexMetrics(null)).toEqual([]);
    expect(modelIndexMetrics({})).toEqual([]);
    expect(modelIndexMetrics({ "model-index": "nope" })).toEqual([]);
  });

  it("flattens results × metrics into rows, carrying task/dataset/verified", () => {
    const out = modelIndexMetrics({
      "model-index": [
        {
          name: "MyModel",
          results: [
            {
              task: { type: "text-generation", name: "Text Generation" },
              dataset: { type: "mmlu", name: "MMLU (5-shot)" },
              metrics: [
                { type: "acc", name: "Accuracy", value: 89.1, verified: false },
                { type: "acc_norm", value: 0.7 },
              ],
            },
          ],
        },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      modelName: "MyModel",
      task: "Text Generation",
      taskType: "text-generation",
      dataset: "MMLU (5-shot)",
      datasetType: "mmlu",
      metricName: "Accuracy",
      value: 89.1,
      verified: false,
    });
    // A metric with no `name` falls back to its `type` for the display name.
    expect(out[1].metricName).toBe("acc_norm");
    expect(out[1].value).toBe(0.7);
  });

  it("skips malformed metrics (no value, null value, non-objects)", () => {
    const out = modelIndexMetrics({
      "model-index": [
        { results: [{ metrics: [{ name: "X" }, { name: "Y", value: null }, 42, { name: "Z", value: 1 }] }] },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].metricName).toBe("Z");
  });
});
