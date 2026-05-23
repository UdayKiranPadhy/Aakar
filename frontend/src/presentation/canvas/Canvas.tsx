/**
 * React Flow canvas host.
 *
 * Computes the current view's nodes via `useNavigation`, runs them through the
 * LayoutRegistry to get (x, y) positions, builds React Flow nodes + edges,
 * and renders them. Selection and expansion callbacks come from useSelection
 * / useNavigation.
 */

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node as ReactFlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { findNodeByPath } from "../../domain/navigation";
import { useNavigation } from "../../application/useNavigation";
import { useSelection } from "../../application/useSelection";
import { useArchStore } from "../../store/archStore";
import { BlockFlowNode, type BlockFlowData } from "./BlockFlowNode";
import { buildEdges } from "./edges";
import { layoutRegistry } from "../layout/LayoutRegistry";
import styles from "./Canvas.module.css";

const nodeTypes = { block: BlockFlowNode } as const;

export function Canvas() {
  const spec = useArchStore((s) => s.spec);
  const { level, expansionPath, currentView, expandNode } = useNavigation();
  const { selectedId, selectNode } = useSelection();

  const { rfNodes, rfEdges } = useMemo(() => {
    if (currentView.length === 0) {
      return { rfNodes: [] as ReactFlowNode[], rfEdges: [] as Edge[] };
    }

    // Determine the parent node's type so we can resolve the right layout.
    const parent =
      spec && expansionPath.length > 0
        ? findNodeByPath(spec.graph, expansionPath)
        : null;
    const parentType = parent?.type ?? null;

    const strategy = layoutRegistry.resolve(parentType ?? "");
    const positions = strategy(currentView);
    const positionById = new Map(positions.map((p) => [p.id, p]));

    const rfNodes: ReactFlowNode[] = currentView.map((node) => {
      const pos = positionById.get(node.id) ?? { x: 0, y: 0 };
      const data: BlockFlowData = {
        specNode: node,
        level,
        isSelected: selectedId === node.id,
        onSelect: selectNode,
        onExpand: expandNode,
      };
      return {
        id: node.id,
        type: "block",
        position: { x: pos.x, y: pos.y },
        data: data as unknown as Record<string, unknown>,
        draggable: false,
        selectable: false,
      };
    });

    const rfEdges = buildEdges(currentView, parentType);
    return { rfNodes, rfEdges };
  }, [currentView, spec, expansionPath, level, selectedId, selectNode, expandNode]);

  if (!spec) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>Paste a HuggingFace model ID above.</p>
          <p className={styles.emptyHint}>
            e.g. meta-llama/Llama-3-8B · mistralai/Mistral-7B-v0.1 · Qwen/Qwen2.5-7B
          </p>
        </div>
      </div>
    );
  }

  // Remount on view change so fitView re-runs cleanly. The key encodes the
  // current zoom path; switching levels triggers a fresh fit. React Flow has
  // an imperative fitView, but for v0.1 the remount is simpler and reliable.
  const flowKey = expansionPath.length === 0 ? "root" : expansionPath.join("/");

  return (
    <ReactFlow
      key={flowKey}
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnDrag
      zoomOnScroll
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e5e7eb" />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  );
}
