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

import { useMemo, useRef, useState } from "react";
import { clsx } from "clsx";

import { matchOutline, outlinePathKey } from "../../domain/navigation";
import type { Node } from "../../domain/spec";
import { useArchStore } from "../../store/archStore";
import { modelViewRegistry } from "../model-views/ModelViewRegistry";
import { flattenVisibleRows } from "./moduleTreeNav";
import { PanelToggleIcon, ViewIcon } from "./NavIcons";
import { ResizeHandle } from "./ResizeHandle";
import { Spinner } from "./ui/Spinner";
import styles from "./ModelSidebar.module.css";

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 460;

export function ModelSidebar() {
  const modelView = useArchStore((s) => s.modelView);
  const setModelView = useArchStore((s) => s.setModelView);
  const clearModel = useArchStore((s) => s.clearModel);
  // True while the introspection (architecture) call is in flight — spec-dependent
  // tabs spin until it resolves. `cardLoading` is the open card-first view's own
  // fetch (Hub metadata / research) — its tab spins until that resolves.
  const loading = useArchStore((s) => s.loading);
  const cardLoading = useArchStore((s) => s.cardLoading);
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
      <button
        type="button"
        className={styles.newModelBtn}
        onClick={() => clearModel()}
        title="New model — back to search"
      >
        <NewModelIcon className={styles.newModelIcon} />
        <span className={styles.navLabel}>New model</span>
      </button>

      <nav className={styles.nav} aria-label="Model views">
        {views.map(({ key, label, needsSpec }) => {
          // Spec-dependent tabs wait on the architecture call; card-first tabs
          // fetch their own data only while open, so spin the active one.
          const pending = needsSpec ? loading : key === modelView && cardLoading;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setModelView(key)}
              aria-current={modelView === key ? "page" : undefined}
              aria-busy={pending || undefined}
              className={clsx(styles.navItem, modelView === key && styles.navItemActive)}
              title={pending ? `${label} — loading…` : label}
            >
              <ViewIcon viewKey={key} className={styles.navIcon} />
              <span className={styles.navLabel}>{label}</span>
              {pending && <Spinner className={styles.navSpinner} />}
            </button>
          );
        })}
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

function NewModelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
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
  // Roving-tabindex focus target for keyboard navigation (the ARIA tree pattern:
  // the whole tree is a single tab stop; arrows move focus between rows).
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const filter = useMemo(
    () => (spec ? matchOutline(spec.graph, query) : null),
    [spec, query],
  );
  // The visible rows in DOM order — keyboard order is computed from exactly this.
  const rows = useMemo(
    () =>
      spec ? flattenVisibleRows(spec.graph, filter, overrides, DEFAULT_OPEN_DEPTH) : [],
    [spec, filter, overrides],
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

  const focusRow = (key: string | undefined) => {
    if (!key) return;
    setActiveKey(key);
    rowRefs.current.get(key)?.focus();
  };

  // ARIA tree keyboard model, operating over the flat `rows` list.
  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    const i = rows.findIndex((r) => r.key === key);
    if (i < 0) return;
    const row = rows[i]!;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusRow(rows[i + 1]?.key);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusRow(rows[i - 1]?.key);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (row.hasChildren && !row.open) setOpen(key, true);
        else if (row.hasChildren && row.open) focusRow(rows[i + 1]?.key);
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (row.hasChildren && row.open) setOpen(key, false);
        else if (row.path.length > 1) focusRow(outlinePathKey(row.path.slice(0, -1)));
        break;
      case "Home":
        e.preventDefault();
        focusRow(rows[0]?.key);
        break;
      case "End":
        e.preventDefault();
        focusRow(rows[rows.length - 1]?.key);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        navigate(row.node, row.path);
        break;
    }
  };

  // Exactly one row is in the tab order: the last-focused, else the selected,
  // else the first — so Tab always lands somewhere sensible.
  const tabbableKey =
    (activeKey && rows.some((r) => r.key === activeKey) && activeKey) ||
    (selectedKey && rows.some((r) => r.key === selectedKey) && selectedKey) ||
    rows[0]?.key ||
    null;

  const registerRef = (key: string, el: HTMLDivElement | null) => {
    if (el) rowRefs.current.set(key, el);
    else rowRefs.current.delete(key);
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
        onKeyDown={(e) => {
          // Hand off from the filter box into the tree.
          if (e.key === "ArrowDown") {
            e.preventDefault();
            focusRow(rows[0]?.key);
          }
        }}
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
              tabbableKey={tabbableKey}
              registerRef={registerRef}
              onToggle={setOpen}
              onNavigate={navigate}
              onKeyDown={handleKeyDown}
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
  filter: ReturnType<typeof matchOutline>;
  overrides: ReadonlyMap<string, boolean>;
  selectedKey: string | null;
  tabbableKey: string | null;
  registerRef: (key: string, el: HTMLDivElement | null) => void;
  onToggle: (key: string, open: boolean) => void;
  onNavigate: (node: Node, path: ReadonlyArray<string>) => void;
  onKeyDown: (e: React.KeyboardEvent, key: string) => void;
}>;

function TreeRow({
  node,
  path,
  depth,
  filter,
  overrides,
  selectedKey,
  tabbableKey,
  registerRef,
  onToggle,
  onNavigate,
  onKeyDown,
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

  // The row <div> is the focusable treeitem (single tab stop, roving tabindex);
  // the inner twisty/label buttons stay clickable but out of the tab order.
  return (
    <li role="none">
      <div
        role="treeitem"
        aria-expanded={hasChildren ? open : undefined}
        aria-selected={selectedKey === key}
        tabIndex={key === tabbableKey ? 0 : -1}
        ref={(el) => registerRef(key, el)}
        onKeyDown={(e) => onKeyDown(e, key)}
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
          tabIndex={-1}
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
              tabbableKey={tabbableKey}
              registerRef={registerRef}
              onToggle={onToggle}
              onNavigate={onNavigate}
              onKeyDown={onKeyDown}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
