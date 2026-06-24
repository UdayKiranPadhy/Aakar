import { describe, expect, it } from "vitest";

import type { ModelInfo } from "../../../domain/modelInfo";
import { dtypeColor, dtypeEntries } from "./dtypePalette";

describe("dtypeColor", () => {
  it("maps known dtypes to design tokens", () => {
    expect(dtypeColor("BF16")).toBe("var(--g-blue)");
    expect(dtypeColor("bf16")).toBe("var(--g-blue)"); // case-insensitive
    expect(dtypeColor("F32")).toBe("var(--g-red)");
  });
  it("falls back to a neutral edge token for unknown dtypes", () => {
    expect(dtypeColor("FP8")).toBe("var(--color-edge)");
  });
});

describe("dtypeEntries", () => {
  it("returns null without safetensors data", () => {
    expect(dtypeEntries({ model_id: "x", tags: [], siblings: [] } as ModelInfo)).toBeNull();
  });
  it("sorts dtype entries largest-first", () => {
    const out = dtypeEntries({
      model_id: "x",
      tags: [],
      siblings: [],
      safetensors: { total: 30, parameters: { F32: 10, BF16: 20 } },
    } as ModelInfo);
    expect(out).not.toBeNull();
    expect(out!.entries[0]).toEqual(["BF16", 20]);
    expect(out!.total).toBe(30);
  });
});
