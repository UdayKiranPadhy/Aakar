/**
 * Routing component for the detail panel.
 *
 * Looks up the right detail panel for the selected node's type via
 * DetailRegistry and renders it. Hidden when nothing is selected or the panel
 * is explicitly closed.
 */

import { useNavigation } from "../../application/useNavigation";
import { useSelection } from "../../application/useSelection";
import { detailRegistry } from "./DetailRegistry";

export function DetailPanel() {
  const { selectedNode, detailOpen, closeDetail } = useSelection();
  const { expandNode } = useNavigation();

  if (!selectedNode || !detailOpen) return null;

  const Panel = detailRegistry.resolve(selectedNode.type);
  return (
    <Panel node={selectedNode} onExpand={expandNode} onClose={closeDetail} />
  );
}
