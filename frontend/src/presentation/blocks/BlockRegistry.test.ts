import { describe, expect, it } from "vitest";

import { BlockRegistry, type BlockNodeComponent } from "./BlockRegistry";

const Fallback: BlockNodeComponent = () => null;
const ByType: BlockNodeComponent = () => null;
const ByCategory: BlockNodeComponent = () => null;

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

  it("falls back to the default when neither type nor category is registered", () => {
    const r = new BlockRegistry(Fallback);
    expect(r.resolve({ type: "unknown" })).toBe(Fallback);
    expect(r.resolve({ type: "unknown", category: "unknown" })).toBe(Fallback);
  });

  it("rejects duplicate registrations", () => {
    const r = new BlockRegistry(Fallback);
    r.register("linear", ByType);
    expect(() => r.register("linear", ByType)).toThrow();
    r.registerCategory("activation", ByCategory);
    expect(() => r.registerCategory("activation", ByCategory)).toThrow();
  });
});
