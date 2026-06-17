/**
 * Pure: collect the GitHub source links across a model's module tree (the
 * `Node.source_url` the backend populates for stock transformers / torch
 * classes), deduped by URL and sorted by class name. Powers the Compare
 * Architecture tab's "Source code mapping". Empty for custom code with no links.
 */

import type { Node, Spec } from "../../../domain/spec";

export type SourceLink = Readonly<{ moduleClass: string; url: string }>;

export function sourceLinks(spec: Spec | null): ReadonlyArray<SourceLink> {
  if (!spec) return [];
  const seen = new Map<string, string>(); // url → display class name (first seen wins)
  const walk = (nodes: ReadonlyArray<Node>): void => {
    for (const n of nodes) {
      if (n.source_url && !seen.has(n.source_url)) {
        seen.set(n.source_url, n.module_class ?? n.label);
      }
      if (n.children) walk(n.children);
    }
  };
  walk(spec.graph);
  return [...seen.entries()]
    .map(([url, moduleClass]) => ({ moduleClass, url }))
    .sort((x, y) => x.moduleClass.localeCompare(y.moduleClass));
}
