/**
 * Navigation value objects and pure helpers.
 *
 * No React, no Zustand — these are domain helpers used by the store and the
 * presentation layer to interpret paths and resolve which nodes to render at
 * each zoom level.
 */

import type { Node } from "./spec";

export type SelectionPath = ReadonlyArray<string>;
export type ExpansionPath = ReadonlyArray<string>;

export type Level = 1 | 2 | 3;

/**
 * Zoom level derived from how many nodes are currently expanded into.
 * 0 expansions → level 1; 1 → level 2; 2+ → level 3 (capped).
 */
export function levelFromExpansion(path: ExpansionPath): Level {
  return Math.min(path.length + 1, 3) as Level;
}

/**
 * Walk a node tree by IDs. Returns null if any segment doesn't exist.
 */
export function findNodeByPath(
  graph: ReadonlyArray<Node>,
  path: ReadonlyArray<string>,
): Node | null {
  if (path.length === 0) return null;
  let siblings: ReadonlyArray<Node> = graph;
  let current: Node | null = null;
  for (const id of path) {
    const found = siblings.find((n) => n.id === id);
    if (!found) return null;
    current = found;
    siblings = found.children ?? [];
  }
  return current;
}

/**
 * Resolve the list of nodes to render at the current zoom level. At level 1
 * this is the root `graph`. At deeper levels it's the children of whichever
 * node is at the end of `expansionPath`.
 */
export function resolveCurrentView(
  graph: ReadonlyArray<Node>,
  expansionPath: ExpansionPath,
): ReadonlyArray<Node> {
  if (expansionPath.length === 0) return graph;
  const parent = findNodeByPath(graph, expansionPath);
  return parent?.children ?? [];
}

/**
 * Look up each node along `expansionPath` so the breadcrumb can render their
 * labels (not just IDs). Returns the array of nodes in order, skipping any
 * IDs that no longer resolve (which shouldn't happen in normal use).
 */
export function resolveBreadcrumbNodes(
  graph: ReadonlyArray<Node>,
  expansionPath: ExpansionPath,
): ReadonlyArray<Node> {
  const out: Node[] = [];
  for (let i = 1; i <= expansionPath.length; i++) {
    const node = findNodeByPath(graph, expansionPath.slice(0, i));
    if (node) out.push(node);
  }
  return out;
}
