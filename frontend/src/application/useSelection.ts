/**
 * Use case: read and mutate the selection / detail-panel state.
 *
 * Derives the currently-selected Node from `selectionPath` + the spec tree so
 * the rest of the app can read the full Node object, not just its ID.
 */

import { useMemo } from "react";

import { findNodeByPath } from "../domain/navigation";
import type { Node } from "../domain/spec";
import { useArchStore } from "../store/archStore";

export function useSelection() {
  const spec = useArchStore((s) => s.spec);
  const selectionPath = useArchStore((s) => s.selectionPath);
  const detailOpen = useArchStore((s) => s.detailOpen);
  const selectNode = useArchStore((s) => s.selectNode);
  const closeDetail = useArchStore((s) => s.closeDetail);
  // Synthetic-node selection (op / semantic glyphs) lives in its own channel:
  // these nodes aren't in the Spec tree, so they can't be addressed by path.
  const selectedFlowNode = useArchStore((s) => s.selectedFlowNode);
  const selectFlowNode = useArchStore((s) => s.selectFlowNode);

  const selectedNode: Node | null = useMemo(() => {
    if (!spec || selectionPath.length === 0) return null;
    return findNodeByPath(spec.graph, selectionPath);
  }, [spec, selectionPath]);

  const selectedId = selectionPath[selectionPath.length - 1] ?? null;

  return {
    selectedNode,
    selectedId,
    selectionPath,
    detailOpen,
    selectNode,
    closeDetail,
    selectedFlowNode,
    selectFlowNode,
  };
}
