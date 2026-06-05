/**
 * Left dashboard rail for a loaded model.
 *
 *   (a) Section nav — the registered model-views (Overview / Architecture /
 *       Config / Parameters / Compute / Research), driven by the registry.
 *   (b) Module tree — shown only in the Architecture view: a searchable,
 *       collapsible folder view of the nn.Module tree that navigates the
 *       canvas. Reuses the existing navigation primitives (goToExpansion /
 *       selectNode) — no new navigation logic.
 *
 * Collapses to an icon rail via `sidebarCollapsed`, and is drag-resizable on
 * its right edge via `sidebarWidth` + ResizeHandle.
 */

import { useMemo, useState } from "react";
import { clsx } from "clsx";

import {
  matchOutline,
  outlinePathKey,
  type OutlineFilter,
} from "../../domain/navigation";
import type { Node } from "../../domain/spec";
import { useArchStore } from "../../store/archStore";
import { modelViewRegistry } from "../model-views/ModelViewRegistry";
import { PanelToggleIcon, ViewIcon } from "./NavIcons";
import { ResizeHandle } from "./ResizeHandle";
import styles from "./ModelSidebar.module.css";

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 460;

export function ModelSidebar() {
  const modelView = useArchStore((s) => s.modelView);
  const setModelView = useArchStore((s) => s.setModelView);
  const collapsed = useArchStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useArchStore((s) => s.toggleSidebar);
  const width = useArchStore((s) => s.sidebarWidth);
  const setWidth = useArchStore((s) => s.setSidebarWidth);
  const views = modelViewRegistry.list();
  const [resizing, setResizing] = useState(false);

  return (
    <aside
      className={clsx(
        styles.sidebar,
        collapsed && styles.collapsed,
        resizing && styles.resizing,
      )}
      style={collapsed ? undefined : { width }}
    >
      <nav className={styles.nav} aria-label="Model views">
        {views.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setModelView(key)}
            aria-current={modelView === key ? "page" : undefined}
            className={clsx(styles.navItem, modelView === key && styles.navItemActive)}
            title={label}
          >
            <ViewIcon viewKey={key} className={styles.navIcon} />
            <span className={styles.navLabel}>{label}</span>
          </button>
        ))}
      </nav>

      {!collapsed && modelView === "architecture" && <ModuleTree />}

      <button
        type="button"
        className={styles.collapseBtn}
        onClick={() => toggleSidebar()}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <PanelToggleIcon className={styles.toggleIcon} />
        <span className={styles.navLabel}>Collapse</span>
      </button>

      {!collapsed && (
        <ResizeHandle
          width={width}
          min={SIDEBAR_MIN}
          max={SIDEBAR_MAX}
          onChange={setWidth}
          onDragChange={setResizing}
          ariaLabel="Resize sidebar"
        />
      )}
    </aside>
  );
}

/** Nodes shallower than this are open by default; deeper ones start collapsed
 * so a model's long `layers` list doesn't flood the rail on first render. */
const DEFAULT_OPEN_DEPTH = 2;

function ModuleTree() {
  const spec = useArchStore((s) => s.spec);
  const selectionPath = useArchStore((s) => s.selectionPath);
  const goToExpansion = useArchStore((s) => s.goToExpansion);
  const selectNode = useArchStore((s) => s.selectNode);
  const [query, setQuery] = useState("");
  // Explicit user open/close decisions, keyed by path. Absent ⇒ fall back to
  // the depth default. New models produce new path-keys, so this self-resets.
  const [overrides, setOverrides] = useState<Map<string, boolean>>(() => new Map());

  const filter = useMemo(
    () => (spec ? matchOutline(spec.graph, query) : null),
    [spec, query],
  );

  if (!spec || spec.graph.length === 0) return null;

  const selectedKey = selectionPath.length > 0 ? outlinePathKey(selectionPath) : null;

  const setOpen = (key: string, open: boolean) =>
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, open);
      return next;
    });

  const navigate = (node: Node, path: ReadonlyArray<string>) => {
    if (node.has_internals) {
      // Drill the canvas into this node (renders its children).
      goToExpansion(path);
    } else {
      // A leaf: move to its parent's view and select it (opens the detail panel).
      goToExpansion(path.slice(0, -1));
      selectNode(node.id);
    }
  };

  const noMatches = filter !== null && filter.visible.size === 0;

  return (
    <div className={styles.tree}>
      <input
        type="search"
        className={styles.search}
        placeholder="Filter modules…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Filter modules"
      />
      {noMatches ? (
        <p className={styles.empty}>No modules match.</p>
      ) : (
        <ul className={styles.treeList} role="tree" aria-label="Module tree">
          {spec.graph.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              path={[node.id]}
              depth={0}
              filter={filter}
              overrides={overrides}
              selectedKey={selectedKey}
              onToggle={setOpen}
              onNavigate={navigate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type TreeRowProps = Readonly<{
  node: Node;
  path: ReadonlyArray<string>;
  depth: number;
  filter: OutlineFilter | null;
  overrides: ReadonlyMap<string, boolean>;
  selectedKey: string | null;
  onToggle: (key: string, open: boolean) => void;
  onNavigate: (node: Node, path: ReadonlyArray<string>) => void;
}>;

function TreeRow({
  node,
  path,
  depth,
  filter,
  overrides,
  selectedKey,
  onToggle,
  onNavigate,
}: TreeRowProps) {
  const key = outlinePathKey(path);

  // While filtering, hide everything outside the matched branches.
  if (filter && !filter.visible.has(key)) return null;

  const hasChildren = !!node.children && node.children.length > 0;
  const open = filter
    ? filter.expanded.has(key)
    : overrides.has(key)
      ? !!overrides.get(key)
      : depth < DEFAULT_OPEN_DEPTH;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined}>
      <div
        className={clsx(styles.row, selectedKey === key && styles.rowActive)}
        style={{ paddingInlineStart: `calc(var(--space-1) + ${depth} * var(--space-3))` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className={styles.twisty}
            onClick={() => onToggle(key, !open)}
            aria-label={open ? "Collapse" : "Expand"}
            tabIndex={-1}
          >
            <span className={clsx(styles.chevron, open && styles.chevronOpen)}>›</span>
          </button>
        ) : (
          <span className={styles.twistySpacer} aria-hidden="true" />
        )}
        <button
          type="button"
          className={styles.rowLabel}
          onClick={() => onNavigate(node, path)}
          title={node.module_class ?? node.label}
        >
          <span className={styles.rowName}>{node.label}</span>
          {node.module_class && <span className={styles.rowClass}>{node.module_class}</span>}
        </button>
      </div>

      {hasChildren && open && (
        <ul className={styles.subtree} role="group">
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              path={[...path, child.id]}
              depth={depth + 1}
              filter={filter}
              overrides={overrides}
              selectedKey={selectedKey}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
