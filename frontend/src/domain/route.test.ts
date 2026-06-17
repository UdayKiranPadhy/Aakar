import { describe, expect, it } from "vitest";

import { pathToRoute, routeToPath, type RouteState } from "./route";

/** Parsing a URL the serializer produced must return the original state. */
function roundTrip(state: RouteState): RouteState {
  const url = routeToPath(state);
  const [pathname, search = ""] = url.split("?");
  return pathToRoute(pathname, search);
}

describe("routeToPath", () => {
  it("serializes home and learn as bare paths", () => {
    expect(routeToPath({ mode: "home" })).toBe("/");
    expect(routeToPath({ mode: "learn" })).toBe("/learn");
  });

  it("puts the model id in a query param", () => {
    expect(routeToPath({ mode: "model", modelId: "gpt2" })).toBe("/model?id=gpt2");
  });

  it("URL-encodes the slash in an org/name id", () => {
    expect(routeToPath({ mode: "model", modelId: "meta-llama/Llama-3-8B" })).toBe(
      "/model?id=meta-llama%2FLlama-3-8B",
    );
  });

  it("includes view and drill path when present", () => {
    expect(
      routeToPath({ mode: "model", modelId: "gpt2", view: "architecture", path: ["layers", "0", "attn"] }),
    ).toBe("/model?id=gpt2&view=architecture&path=layers%2F0%2Fattn");
  });

  it("omits empty drill path and empty id", () => {
    expect(routeToPath({ mode: "model", modelId: "gpt2", path: [] })).toBe("/model?id=gpt2");
    expect(routeToPath({ mode: "model", modelId: "" })).toBe("/model");
  });

  it("serializes a compare pair", () => {
    expect(routeToPath({ mode: "compare", a: "gpt2", b: "bert-base-uncased", view: "compute" })).toBe(
      "/compare?a=gpt2&b=bert-base-uncased&view=compute",
    );
  });

  it("allows a partial compare (one slot only)", () => {
    expect(routeToPath({ mode: "compare", a: "gpt2" })).toBe("/compare?a=gpt2");
    expect(routeToPath({ mode: "compare" })).toBe("/compare");
  });
});

describe("pathToRoute", () => {
  it("treats unknown and root paths as home", () => {
    expect(pathToRoute("/", "")).toEqual({ mode: "home" });
    expect(pathToRoute("/nonsense", "")).toEqual({ mode: "home" });
    expect(pathToRoute("", "")).toEqual({ mode: "home" });
  });

  it("decodes the slash in a model id", () => {
    expect(pathToRoute("/model", "?id=meta-llama%2FLlama-3-8B")).toEqual({
      mode: "model",
      modelId: "meta-llama/Llama-3-8B",
      view: undefined,
      path: undefined,
    });
  });

  it("splits the drill path into node ids", () => {
    const r = pathToRoute("/model", "?id=gpt2&view=architecture&path=layers%2F0%2Fattn");
    expect(r).toEqual({
      mode: "model",
      modelId: "gpt2",
      view: "architecture",
      path: ["layers", "0", "attn"],
    });
  });

  it("is tolerant of a trailing slash and mixed case in the segment", () => {
    expect(pathToRoute("/Compare/", "?a=gpt2")).toEqual({
      mode: "compare",
      a: "gpt2",
      b: undefined,
      view: undefined,
    });
  });

  it("drops blank params", () => {
    expect(pathToRoute("/model", "?id=gpt2&view=&path=")).toEqual({
      mode: "model",
      modelId: "gpt2",
      view: undefined,
      path: undefined,
    });
  });
});

describe("round trip", () => {
  const cases: ReadonlyArray<RouteState> = [
    { mode: "home" },
    { mode: "learn" },
    { mode: "model", modelId: "gpt2" },
    { mode: "model", modelId: "meta-llama/Llama-3-8B", view: "parameters" },
    { mode: "model", modelId: "gpt2", view: "architecture", path: ["layers", "0", "self_attn"] },
    { mode: "compare", a: "gpt2", b: "meta-llama/Llama-3-8B", view: "tokens" },
    { mode: "compare", a: "gpt2" },
  ];

  // `toEqual` ignores the `undefined` extras `pathToRoute` fills in (view/path/a/b).
  it.each(cases)("survives serialize → parse: %o", (state) => {
    expect(roundTrip(state)).toEqual(state);
  });
});
