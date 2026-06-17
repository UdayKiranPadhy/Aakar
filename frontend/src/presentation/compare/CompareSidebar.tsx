/**
 * Left rail for the Compare page — the registered Compare-views (Overview /
 * Architecture / Parameters / Compute / Tokens / Files / Research) as a section
 * nav, driven by `compareViewRegistry`. Mirrors the model dashboard's
 * `ModelSidebar` (minus the module tree): collapses to an icon rail and is
 * drag-resizable, reusing the same `sidebarCollapsed` / `sidebarWidth` state
 * (only one app surface renders at a time, so there's no conflict).
 */

import { useState } from "react";
import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import { CompareViewIcon, PanelToggleIcon } from "../components/NavIcons";
import { ResizeHandle } from "../components/ResizeHandle";
import { compareViewRegistry } from "../compare-views/CompareViewRegistry";
import styles from "./CompareSidebar.module.css";

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 460;

export function CompareSidebar() {
  const compareView = useArchStore((s) => s.compareView);
  const setCompareView = useArchStore((s) => s.setCompareView);
  const collapsed = useArchStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useArchStore((s) => s.toggleSidebar);
  const width = useArchStore((s) => s.sidebarWidth);
  const setWidth = useArchStore((s) => s.setSidebarWidth);
  const views = compareViewRegistry.list();
  const [resizing, setResizing] = useState(false);

  return (
    <aside
      className={clsx(styles.sidebar, collapsed && styles.collapsed, resizing && styles.resizing)}
      style={collapsed ? undefined : { width }}
    >
      <nav className={styles.nav} aria-label="Comparison views">
        {views.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setCompareView(key)}
            aria-current={compareView === key ? "page" : undefined}
            className={clsx(styles.navItem, compareView === key && styles.navItemActive)}
            title={label}
          >
            <CompareViewIcon viewKey={key} className={styles.navIcon} />
            <span className={styles.navLabel}>{label}</span>
          </button>
        ))}
      </nav>

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
