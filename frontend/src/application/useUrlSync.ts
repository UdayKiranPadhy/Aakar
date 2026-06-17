/**
 * Use case: keep the browser URL and the navigation store in lockstep.
 *
 * A thin bidirectional adapter. The Zustand store stays the runtime source of
 * truth that components read; this hook (1) applies the URL into the store on
 * load and on back/forward, and (2) reflects store navigation changes back into
 * the URL. The pure grammar lives in `domain/route`; view validation is injected
 * by the caller (App) so this hook stays clear of the presentation registries.
 *
 * Loop-free by construction: both directions converge on the single canonical
 * string from `routeToPath`, and outbound writes are coalesced to a microtask,
 * so a multi-`set` transition (e.g. `loadModel`'s reset → mode → loading burst)
 * yields one navigation from the *final* state — never an intermediate one.
 */

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { CompareView, ModelView } from "../domain/navigation";
import { pathToRoute, routeToPath } from "../domain/route";
import { useArchStore } from "../store/archStore";
import { useCompareModels } from "./useCompareModels";

type Store = ReturnType<typeof useArchStore.getState>;

export type UrlSyncOptions = Readonly<{
  /** Load a model as the primary spec (injected so this hook avoids the repo). */
  loadModel: (modelId: string) => void;
  /** Coerce a raw `?view=` into a registered ModelView, else the default. */
  toModelView: (raw: string | undefined) => ModelView;
  /** Coerce a raw `?view=` into a registered CompareView, else the default. */
  toCompareView: (raw: string | undefined) => CompareView;
}>;

/** The view both surfaces default to; omitted from the URL to keep it clean. */
const DEFAULT_VIEW = "overview";

/** The canonical URL for the store's current navigable state. */
function buildUrl(s: Store): string {
  switch (s.appMode) {
    case "model": {
      // Prefer the loaded spec, but fall back so the id survives the load window
      // (spec still null) and the error case (spec cleared).
      const modelId = s.spec?.model_id ?? s.requestedModelId ?? s.error?.modelId ?? "";
      return routeToPath({
        mode: "model",
        modelId,
        view: s.modelView !== DEFAULT_VIEW ? s.modelView : undefined,
        path: s.expansionPath.length > 0 ? s.expansionPath : undefined,
      });
    }
    case "compare":
      return routeToPath({
        // Fall back to the requested id so a slot still loading keeps its query
        // param (mirrors the `requestedModelId` fallback for the primary model).
        mode: "compare",
        a: s.compareA?.model_id ?? s.requestedCompareA ?? undefined,
        b: s.compareB?.model_id ?? s.requestedCompareB ?? undefined,
        view: s.compareView !== DEFAULT_VIEW ? s.compareView : undefined,
      });
    case "learn":
      return routeToPath({ mode: "learn" });
    default:
      return routeToPath({ mode: "home" });
  }
}

function sameIds(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function useUrlSync({ loadModel, toModelView, toCompareView }: UrlSyncOptions): void {
  const location = useLocation();
  const navigate = useNavigate();
  const { load: loadCompare } = useCompareModels();

  // Latest location, readable from the (effect-scoped) outbound subscription.
  const locationRef = useRef(location);
  locationRef.current = location;

  // Inbound: URL → store. Runs on mount and whenever the location changes
  // (a link click that navigated, or the browser back/forward buttons).
  useEffect(() => {
    const route = pathToRoute(location.pathname, location.search);
    const s = useArchStore.getState();

    switch (route.mode) {
      case "home":
        if (s.appMode !== "home") s.setAppMode("home");
        break;
      case "learn":
        if (s.appMode !== "learn") s.setAppMode("learn");
        break;
      case "model": {
        if (s.appMode !== "model") s.setAppMode("model");
        const currentId = s.spec?.model_id ?? s.requestedModelId ?? s.error?.modelId ?? null;
        if (route.modelId && route.modelId !== currentId) loadModel(route.modelId);
        // Re-read: `loadModel` resets modelView/expansionPath synchronously, so
        // the guards below must compare against the post-reset values.
        const after = useArchStore.getState();
        const view = toModelView(route.view);
        if (after.modelView !== view) after.setModelView(view);
        const path = route.path ?? [];
        if (!sameIds(after.expansionPath, path)) after.goToExpansion(path);
        break;
      }
      case "compare": {
        if (s.appMode !== "compare") s.setAppMode("compare");
        // Skip if the slot already holds (or is already fetching) this id.
        if (route.a && route.a !== s.compareA?.model_id && route.a !== s.requestedCompareA)
          void loadCompare("a", route.a);
        if (route.b && route.b !== s.compareB?.model_id && route.b !== s.requestedCompareB)
          void loadCompare("b", route.b);
        const view = toCompareView(route.view);
        if (s.compareView !== view) s.setCompareView(view);
        break;
      }
    }
  }, [location.pathname, location.search, loadModel, loadCompare, toModelView, toCompareView]);

  // Outbound: store → URL. Subscribe once; coalesce a burst of sets into a
  // single microtask so the navigation reflects the final state. Push for a
  // genuine change; replace when the URL is only a non-canonical spelling of it.
  useEffect(() => {
    let queued = false;
    const flush = () => {
      queued = false;
      const url = buildUrl(useArchStore.getState());
      const { pathname, search } = locationRef.current;
      const here = pathname + search;
      if (url === here) return;
      const replace = routeToPath(pathToRoute(pathname, search)) === url;
      navigate(url, { replace });
    };
    return useArchStore.subscribe(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(flush);
    });
  }, [navigate]);
}
