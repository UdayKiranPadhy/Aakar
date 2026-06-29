import { describe, expect, it } from "vitest";

import { BlockRegistry, type BlockNodeComponent } from "./BlockRegistry";

const Fallback: BlockNodeComponent = () => null;
const ByType: BlockNodeComponent = () => null;
const ByCategory: BlockNodeComponent = () => null;
const ByRole: BlockNodeComponent = () => null;

describe("BlockRegistry", () => {
  it("prefers a type-keyed renderer over a category-keyed one", () => {
    const r = new BlockRegistry(Fallback);
    r.register("si_lu", ByType);
    r.registerCategory("activation", ByCategory);
    expect(r.resolve({ type: "si_lu", category: "activation" })).toBe(ByType);
  });

  it("falls back to category when no type is registered", () => {
    const r = new BlockRegistry(Fallback);
    r.registerCategory("activation", ByCategory);
    expect(r.resolve({ type: "gelu_activation", category: "activation" })).toBe(
      ByCategory,
    );
  });

  it("falls back to role after type and category miss", () => {
    const r = new BlockRegistry(Fallback);
    r.registerRole("moe", ByRole);
    expect(
      r.resolve({ type: "mixtral_sparse_moe_block", category: "container", role: "moe" }),
    ).toBe(ByRole);
  });

  it("prefers type and category over role", () => {
    const r = new BlockRegistry(Fallback);
    r.register("mixtral_sparse_moe_block", ByType);
    r.registerCategory("container", ByCategory);
    r.registerRole("moe", ByRole);
    expect(
      r.resolve({ type: "mixtral_sparse_moe_block", category: "container", role: "moe" }),
    ).toBe(ByType);
    expect(r.resolve({ type: "other", category: "container", role: "moe" })).toBe(ByCategory);
  });

  it("falls back to the default when nothing is registered", () => {
    const r = new BlockRegistry(Fallback);
    expect(r.resolve({ type: "unknown" })).toBe(Fallback);
    expect(r.resolve({ type: "unknown", category: "unknown", role: "unknown" })).toBe(Fallback);
  });

  it("rejects duplicate registrations", () => {
    const r = new BlockRegistry(Fallback);
    r.register("linear", ByType);
    expect(() => r.register("linear", ByType)).toThrow();
    r.registerCategory("activation", ByCategory);
    expect(() => r.registerCategory("activation", ByCategory)).toThrow();
    r.registerRole("moe", ByRole);
    expect(() => r.registerRole("moe", ByRole)).toThrow();
  });
});
