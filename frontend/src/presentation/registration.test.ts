/**
 * Smoke test that the role-keyed concept renderers are actually wired into the
 * registries (catches a forgotten registration line in register.ts).
 */

import { describe, expect, it } from "vitest";

import "./blocks/register";
import "./details/register";
import { blockRegistry } from "./blocks/BlockRegistry";
import { MoeBlockNode } from "./blocks/MoeBlockNode";
import { detailRegistry } from "./details/DetailRegistry";
import { AttentionDetail } from "./details/AttentionDetail";
import { MoeDetail } from "./details/MoeDetail";
import { NormalizationDetail } from "./details/NormalizationDetail";

describe("registry wiring", () => {
  it("resolves the MoE block renderer by role across families", () => {
    expect(
      blockRegistry.resolve({
        type: "mixtral_sparse_moe_block",
        category: "container",
        role: "moe",
      }),
    ).toBe(MoeBlockNode);
  });

  it("resolves attention / moe / norm detail panels by role", () => {
    expect(detailRegistry.resolveNode({ type: "llama_attention", role: "attention" })).toBe(
      AttentionDetail,
    );
    expect(detailRegistry.resolveNode({ type: "qwen2_moe_sparse_moe_block", role: "moe" })).toBe(
      MoeDetail,
    );
    expect(detailRegistry.resolveNode({ type: "llama_rms_norm", role: "norm" })).toBe(
      NormalizationDetail,
    );
  });
});
