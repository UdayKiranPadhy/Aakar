import { describe, expect, it } from "vitest";

import { DetailRegistry, type DetailPanelComponent } from "./DetailRegistry";

const Fallback: DetailPanelComponent = () => null;
const ByType: DetailPanelComponent = () => null;
const ByRole: DetailPanelComponent = () => null;

describe("DetailRegistry", () => {
  it("resolves a type-keyed panel", () => {
    const r = new DetailRegistry(Fallback);
    r.register("linear", ByType);
    expect(r.resolveNode({ type: "linear" })).toBe(ByType);
  });

  it("falls back to role after a type miss", () => {
    const r = new DetailRegistry(Fallback);
    r.registerRole("attention", ByRole);
    expect(r.resolveNode({ type: "llama_sdpa_attention", role: "attention" })).toBe(ByRole);
  });

  it("prefers type over role", () => {
    const r = new DetailRegistry(Fallback);
    r.register("llama_sdpa_attention", ByType);
    r.registerRole("attention", ByRole);
    expect(r.resolveNode({ type: "llama_sdpa_attention", role: "attention" })).toBe(ByType);
  });

  it("falls back to the default when nothing matches", () => {
    const r = new DetailRegistry(Fallback);
    expect(r.resolveNode({ type: "unknown" })).toBe(Fallback);
    expect(r.resolveNode({ type: "unknown", role: "unknown" })).toBe(Fallback);
  });

  it("rejects duplicate registrations", () => {
    const r = new DetailRegistry(Fallback);
    r.register("linear", ByType);
    expect(() => r.register("linear", ByType)).toThrow();
    r.registerRole("attention", ByRole);
    expect(() => r.registerRole("attention", ByRole)).toThrow();
  });
});
