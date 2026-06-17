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
 * Top-level app mode — the second-row tabs. `home` is the landing page; `model`
 * is the loaded-model dashboard (left sidebar + a model-scoped view); `compare`
 * and `learn` are cross-model surfaces.
 */
export type AppMode = "home" | "model" | "compare" | "learn";

/** Which column a model occupies in the Compare view. */
export type CompareSlot = "a" | "b";

/**
 * Which model-scoped view the dashboard shows (left sidebar selection).
 * `architecture` is the React Flow diagram; the rest are information views.
 * Each maps to an entry in the frontend `ModelViewRegistry`.
 */
export type ModelView =
  | "overview"
  | "architecture"
  | "journey"
  | "config"
  | "parameters"
  | "compute"
  | "research";

/**
 * Which Compare tab is active (left CompareSidebar selection). Maps to an entry
 * in the frontend `CompareViewRegistry`. Benchmarks is deliberately not a tab —
 * eval data, when a model card carries it, renders inside the Overview tab.
 */
export type CompareView =
  | "overview"
  | "architecture"
  | "parameters"
  | "compute"
  | "tokens"
  | "files"
  | "research";

/**
 * Which Learn-page section is active (left LearnSidebar selection). Maps to an
 * entry in the frontend `LearnViewRegistry`. The Learn surface is entirely
 * self-contained, statically-authored content — it never calls the backend.
 */
export type LearnView =
  | "overview"
  | "timeline"
  | "concepts"
  | "architectures"
  | "papers"
  | "blogs"
  | "paths"
  | "benchmarks"
  | "companies"
  | "datasets"
  | "visualizations"
  | "glossary";

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

/**
 * Stable key for a node in the sidebar's module tree: its full root-to-node id
 * path joined with "/". Paths are unique across the tree, so this disambiguates
 * nodes that share an id under different parents (e.g. each layer's `self_attn`).
 */
export function outlinePathKey(path: ReadonlyArray<string>): string {
  return path.join("/");
}

/**
 * Result of filtering the sidebar's module tree by a search query.
 *   - `visible`  — path-keys to render: every match plus all of its ancestors,
 *                  so matches stay readable in their tree context.
 *   - `expanded` — path-keys to force-open: ancestors of any match, so the tree
 *                  auto-unfolds to reveal what matched.
 */
export type OutlineFilter = Readonly<{
  visible: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
}>;

/**
 * Compute the visible/auto-expanded path-key sets for a module-tree search.
 * Pure (no React). Returns `null` for an empty query, meaning "no filter —
 * render the whole tree with its default expansion". A node matches when the
 * query is a case-insensitive substring of its label or module_class.
 */
export function matchOutline(
  graph: ReadonlyArray<Node>,
  query: string,
): OutlineFilter | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const visible = new Set<string>();
  const expanded = new Set<string>();

  const walk = (
    nodes: ReadonlyArray<Node>,
    parentPath: ReadonlyArray<string>,
  ): boolean => {
    let matchedHere = false;
    for (const node of nodes) {
      const path = [...parentPath, node.id];
      const key = outlinePathKey(path);
      const selfMatch =
        node.label.toLowerCase().includes(q) ||
        (node.module_class ?? "").toLowerCase().includes(q);
      const childMatch =
        node.children && node.children.length > 0 ? walk(node.children, path) : false;
      if (selfMatch || childMatch) {
        visible.add(key);
        // Open this branch only when a descendant matched; a self-only match is
        // a leaf as far as the search is concerned and needn't unfold.
        if (childMatch) expanded.add(key);
        matchedHere = true;
      }
    }
    return matchedHere;
  };

  walk(graph, []);
  return { visible, expanded };
}
