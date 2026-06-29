/**
 * Flatten the module tree into the list of *visible* rows, in DOM order, applying
 * the exact same visibility + open-state rules `TreeRow` renders with. Keyboard
 * navigation walks this flat list so arrow-key order is provably identical to what's
 * on screen. Pure (no React) and unit-tested.
 */

import { outlinePathKey, type OutlineFilter } from "../../domain/navigation";
import type { Node } from "../../domain/spec";

export type FlatRow = Readonly<{
  node: Node;
  path: ReadonlyArray<string>;
  key: string;
  depth: number;
  hasChildren: boolean;
  open: boolean;
}>;

export function flattenVisibleRows(
  graph: ReadonlyArray<Node>,
  filter: OutlineFilter | null,
  overrides: ReadonlyMap<string, boolean>,
  defaultOpenDepth: number,
): FlatRow[] {
  const rows: FlatRow[] = [];

  const walk = (nodes: ReadonlyArray<Node>, parentPath: ReadonlyArray<string>, depth: number) => {
    for (const node of nodes) {
      const path = [...parentPath, node.id];
      const key = outlinePathKey(path);
      // While filtering, hide everything outside the matched branches.
      if (filter && !filter.visible.has(key)) continue;

      const hasChildren = !!node.children && node.children.length > 0;
      const open = filter
        ? filter.expanded.has(key)
        : overrides.has(key)
          ? !!overrides.get(key)
          : depth < defaultOpenDepth;

      rows.push({ node, path, key, depth, hasChildren, open });
      if (hasChildren && open) walk(node.children!, path, depth + 1);
    }
  };

  walk(graph, [], 0);
  return rows;
}
