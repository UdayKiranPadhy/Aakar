/**
 * Routing + chrome for the right detail panel.
 *
 * Looks up the right detail panel for the selected node's type via
 * DetailRegistry and renders it inside a resizable, collapsible dock. The dock
 * owns the layout chrome (drag-to-resize on its left edge, collapse-to-rail
 * toggle) so the individual registered panels stay focused on content.
 *
 * Hidden entirely when nothing is selected or the panel is explicitly closed
 * (the ✕ inside a panel). "Collapsed" is distinct from "closed": it keeps the
 * selection and shrinks to a thin rail you can re-expand.
 */

import { useState } from "react";
import { clsx } from "clsx";

import { useNavigation } from "../../application/useNavigation";
import { useSelection } from "../../application/useSelection";
import { useArchStore } from "../../store/archStore";
import { ResizeHandle } from "../components/ResizeHandle";
import { detailRegistry } from "./DetailRegistry";
import styles from "./DetailPanel.module.css";

const DETAIL_MIN = 280;
const DETAIL_MAX = 640;

export function DetailPanel() {
  const { selectedNode, detailOpen, closeDetail } = useSelection();
  const { expandNode } = useNavigation();
  const width = useArchStore((s) => s.detailWidth);
  const setWidth = useArchStore((s) => s.setDetailWidth);
  const collapsed = useArchStore((s) => s.detailCollapsed);
  const toggleDetail = useArchStore((s) => s.toggleDetail);
  const [resizing, setResizing] = useState(false);

  if (!selectedNode || !detailOpen) return null;

  if (collapsed) {
    return (
      <aside className={clsx(styles.dock, styles.collapsed)}>
        <button
          type="button"
          className={styles.railBtn}
          onClick={() => toggleDetail(false)}
          aria-label="Expand detail panel"
          aria-expanded={false}
        >
          ‹
        </button>
        <span className={styles.railLabel}>Details</span>
      </aside>
    );
  }

  const Panel = detailRegistry.resolve(selectedNode.type);
  return (
    <aside
      className={clsx(styles.dock, resizing && styles.resizing)}
      style={{ width }}
    >
      <ResizeHandle
        width={width}
        min={DETAIL_MIN}
        max={DETAIL_MAX}
        invert
        onChange={setWidth}
        onDragChange={setResizing}
        ariaLabel="Resize detail panel"
      />
      <button
        type="button"
        className={styles.collapseBtn}
        onClick={() => toggleDetail(true)}
        aria-label="Collapse detail panel"
        aria-expanded
      >
        ›
      </button>
      <Panel node={selectedNode} onExpand={expandNode} onClose={closeDetail} />
    </aside>
  );
}
