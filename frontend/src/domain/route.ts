/**
 * URL grammar (pure). Maps the app's navigable state to and from a location.
 *
 * No React, no router, no store — just `string ⇄ RouteState`. This is the
 * single source of truth for what a shareable Aakar URL looks like, kept here
 * (domain) so it stays framework-free and trivially unit-testable. The
 * application-layer `useUrlSync` hook is the only caller that binds it to the
 * browser and the store.
 *
 * Scheme — the app *mode* is the path; everything else rides in query params:
 *
 *   home      /
 *   model     /model?id=<modelId>[&view=<view>][&path=<a/b/c>]
 *   compare   /compare[?a=<idA>][&b=<idB>][&view=<view>]
 *   learn     /learn
 *
 * HuggingFace ids contain a slash (e.g. `meta-llama/Llama-3-8B`); carrying the
 * id in a query param (URL-encoded by `URLSearchParams`) sidesteps any
 * path-segment collision. `view` is a raw string here — it is validated against
 * the view registries in the application layer, so registering a new view needs
 * no change to this grammar.
 */

export type RouteState =
  | { readonly mode: "home" }
  | {
      readonly mode: "model";
      readonly modelId: string;
      readonly view?: string;
      /** Drill-down expansion path through the module tree (node ids). */
      readonly path?: ReadonlyArray<string>;
    }
  | {
      readonly mode: "compare";
      readonly a?: string;
      readonly b?: string;
      readonly view?: string;
    }
  | { readonly mode: "learn" };

/** Joins node ids in the drill `path` param. Matches `outlinePathKey`. */
const PATH_SEP = "/";

/** Serialize a `RouteState` to a canonical `pathname?search` string. */
export function routeToPath(state: RouteState): string {
  switch (state.mode) {
    case "home":
      return "/";
    case "learn":
      return "/learn";
    case "model": {
      const q = new URLSearchParams();
      if (state.modelId) q.set("id", state.modelId);
      if (state.view) q.set("view", state.view);
      if (state.path && state.path.length > 0) q.set("path", state.path.join(PATH_SEP));
      const search = q.toString();
      return search ? `/model?${search}` : "/model";
    }
    case "compare": {
      const q = new URLSearchParams();
      if (state.a) q.set("a", state.a);
      if (state.b) q.set("b", state.b);
      if (state.view) q.set("view", state.view);
      const search = q.toString();
      return search ? `/compare?${search}` : "/compare";
    }
  }
}

/**
 * Parse a location into a `RouteState`. The inverse of `routeToPath` for any
 * canonical input; tolerant of extras (unknown paths fall back to `home`,
 * blank params are dropped) so a hand-typed or stale URL never throws.
 */
export function pathToRoute(pathname: string, search: string): RouteState {
  const q = new URLSearchParams(search);
  const segment = pathname.replace(/^\/+|\/+$/g, "").split("/")[0]?.toLowerCase() ?? "";

  switch (segment) {
    case "model": {
      const modelId = q.get("id")?.trim() ?? "";
      const rawPath = q.get("path")?.trim();
      const path = rawPath ? rawPath.split(PATH_SEP).filter(Boolean) : undefined;
      return {
        mode: "model",
        modelId,
        view: q.get("view")?.trim() || undefined,
        path: path && path.length > 0 ? path : undefined,
      };
    }
    case "compare":
      return {
        mode: "compare",
        a: q.get("a")?.trim() || undefined,
        b: q.get("b")?.trim() || undefined,
        view: q.get("view")?.trim() || undefined,
      };
    case "learn":
      return { mode: "learn" };
    default:
      return { mode: "home" };
  }
}
