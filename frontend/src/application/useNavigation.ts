/**
 * Use case: navigate between zoom levels.
 *
 * Wraps store slices with intent-revealing methods (`goBackOneLevel`,
 * `expandSelected`) so components don't reach into the store's primitives.
 */

import { useCallback } from "react";

import {
  type Level,
  resolveBreadcrumbNodes,
  resolveCurrentView,
} from "../domain/navigation";
import { useArchStore } from "../store/archStore";

export function useNavigation() {
  const spec = useArchStore((s) => s.spec);
  const expansionPath = useArchStore((s) => s.expansionPath);
  const level = useArchStore((s) => s.level);
  const expandNode = useArchStore((s) => s.expandNode);
  const collapseToLevel = useArchStore((s) => s.collapseToLevel);

  const currentView = spec ? resolveCurrentView(spec.graph, expansionPath) : [];
  const breadcrumb = spec ? resolveBreadcrumbNodes(spec.graph, expansionPath) : [];

  const goToLevel = useCallback(
    (target: Level) => collapseToLevel(target),
    [collapseToLevel],
  );

  const goToRoot = useCallback(() => collapseToLevel(1), [collapseToLevel]);

  const goBackOneLevel = useCallback(() => {
    if (level === 1) return;
    collapseToLevel((level - 1) as Level);
  }, [collapseToLevel, level]);

  return {
    level,
    expansionPath,
    currentView,
    breadcrumb,
    expandNode,
    goToLevel,
    goToRoot,
    goBackOneLevel,
  };
}
