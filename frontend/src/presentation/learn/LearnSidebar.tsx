/**
 * Left rail for the Learn page — the registered Learn-sections (Overview /
 * Timeline / Concepts / …) as a section nav, driven by `learnViewRegistry`.
 * Mirrors the `CompareSidebar`: collapses to an icon rail and is drag-resizable,
 * reusing the same `sidebarCollapsed` / `sidebarWidth` store fields (only one
 * app surface renders at a time, so there's no conflict).
 */

import { useState } from "react";
import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import { PanelToggleIcon } from "../components/NavIcons";
import { ResizeHandle } from "../components/ResizeHandle";
import { learnViewRegistry } from "../learn-views/LearnViewRegistry";
import { LearnIcon } from "./LearnIcons";
import styles from "./LearnSidebar.module.css";

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 320;

export function LearnSidebar() {
  const learnView = useArchStore((s) => s.learnView);
  const setLearnView = useArchStore((s) => s.setLearnView);
  const collapsed = useArchStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useArchStore((s) => s.toggleSidebar);
  const width = useArchStore((s) => s.sidebarWidth);
  const setWidth = useArchStore((s) => s.setSidebarWidth);
  const views = learnViewRegistry.list();
  const [resizing, setResizing] = useState(false);

  return (
    <aside
      className={clsx(styles.sidebar, collapsed && styles.collapsed, resizing && styles.resizing)}
      style={collapsed ? undefined : { width }}
    >
      {!collapsed && <p className={styles.groupLabel}>Learn AI</p>}

      <nav className={styles.nav} aria-label="Learn sections">
        {views.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setLearnView(key)}
            aria-current={learnView === key ? "page" : undefined}
            className={clsx(styles.navItem, learnView === key && styles.navItemActive)}
            title={label}
          >
            <LearnIcon viewKey={key} className={styles.navIcon} />
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
