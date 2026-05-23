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
  Controls,
  MiniMap,
  ReactFlow,
  type CoordinateExtent,
  type Edge,
  type Node as ReactFlowNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { findNodeByPath } from "../../domain/navigation";
import { useNavigation } from "../../application/useNavigation";
import { useSelection } from "../../application/useSelection";
import { useArchStore } from "../../store/archStore";
import { BlockFlowNode, type BlockFlowData } from "./BlockFlowNode";
import {
  buildContextEdge,
  buildEdges,
  highlightEdgesForSelection,
  inputOutputForSelection,
} from "./edges";
import { ContextBlockFlowNode, type ContextBlockData } from "./ContextBlockNode";
import { ResidualEdge } from "./ResidualEdge";
import { layoutRegistry } from "../layout/LayoutRegistry";
import styles from "./Canvas.module.css";

const nodeTypes = {
  block: BlockFlowNode,
  // Speech-bubble callouts for the previous-sibling block (rendered above)
  // and the next-sibling block (rendered below).
  context: ContextBlockFlowNode,
} as const;
// The custom `residual` edge type bows out to the right; everything else
// uses React Flow's bezier default.
const edgeTypes = { residual: ResidualEdge } as const;

// Vertical offset of the context card above the first node of the current
// view. Big enough to clearly separate it from the live flow.
const CONTEXT_Y_OFFSET = 180;

export function Canvas() {
  const spec = useArchStore((s) => s.spec);
  const { level, expansionPath, currentView, expandNode } = useNavigation();
  const { selectedId, selectNode } = useSelection();

  const { rfNodes, rfEdges, translateExtent } = useMemo(() => {
    if (currentView.length === 0) {
      return {
        rfNodes: [] as ReactFlowNode[],
        rfEdges: [] as Edge[],
        translateExtent: undefined,
      };
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

    // Build edges first so we can derive input / output neighbours of the
    // selected node — they get the green / amber border colours in the
    // renderer (and the matching edge stroke colours via
    // highlightEdgesForSelection below).
    const rawEdges = buildEdges(currentView, parentType);
    const { inputs, outputs } = inputOutputForSelection(rawEdges, selectedId);

    // Find the previous and next siblings of the currently-expanded node.
    // If they exist *and* have internals (i.e. they're sibling blocks worth
    // navigating to, not leaves like positional embedding or final_norm),
    // render them as speech-bubble callouts above and below the current
    // view so the user always knows what fed in and what flows out.
    let prevContextNode: ReactFlowNode | null = null;
    let prevContextEdge: ReturnType<typeof buildContextEdge> | null = null;
    let nextContextNode: ReactFlowNode | null = null;
    let nextContextEdge: ReturnType<typeof buildContextEdge> | null = null;
    if (spec && expansionPath.length > 0) {
      const currentId = expansionPath[expansionPath.length - 1]!;
      const parentExpansion = expansionPath.slice(0, -1);
      const siblings =
        parentExpansion.length === 0
          ? spec.graph
          : (findNodeByPath(spec.graph, parentExpansion)?.children ?? []);
      const idx = siblings.findIndex((n) => n.id === currentId);

      // Previous sibling — anchored to the first node of the current view.
      const prev = idx > 0 ? siblings[idx - 1] : null;
      const firstChildPos = positions[0];
      if (prev?.has_internals && firstChildPos && currentView[0]) {
        const data: ContextBlockData = {
          specNode: prev,
          contextPath: [...parentExpansion, prev.id],
          direction: "previous",
        };
        prevContextNode = {
          id: `__context_prev__${prev.id}`,
          type: "context",
          position: { x: firstChildPos.x, y: firstChildPos.y - CONTEXT_Y_OFFSET },
          data: data as unknown as Record<string, unknown>,
          draggable: false,
          selectable: false,
        };
        prevContextEdge = buildContextEdge(prevContextNode.id, currentView[0].id);
      }

      // Next sibling — anchored to the last node of the current view.
      const next =
        idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
      const lastChildPos = positions[positions.length - 1];
      const lastChild = currentView[currentView.length - 1];
      if (next?.has_internals && lastChildPos && lastChild) {
        const data: ContextBlockData = {
          specNode: next,
          contextPath: [...parentExpansion, next.id],
          direction: "next",
        };
        nextContextNode = {
          id: `__context_next__${next.id}`,
          type: "context",
          position: { x: lastChildPos.x, y: lastChildPos.y + CONTEXT_Y_OFFSET },
          data: data as unknown as Record<string, unknown>,
          draggable: false,
          selectable: false,
        };
        nextContextEdge = buildContextEdge(lastChild.id, nextContextNode.id);
      }
    }

    const rfNodes: ReactFlowNode[] = currentView.map((node) => {
      const pos = positionById.get(node.id) ?? { x: 0, y: 0 };
      const role = inputs.has(node.id)
        ? ("input" as const)
        : outputs.has(node.id)
          ? ("output" as const)
          : undefined;
      const data: BlockFlowData = {
        specNode: node,
        level,
        isSelected: selectedId === node.id,
        role,
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

    const rfEdges = highlightEdgesForSelection(rawEdges, selectedId);
    if (prevContextEdge) rfEdges.push(prevContextEdge);
    if (nextContextEdge) rfEdges.push(nextContextEdge);
    if (prevContextNode) rfNodes.unshift(prevContextNode);
    if (nextContextNode) rfNodes.push(nextContextNode);

    // Compute the bounding box of the laid-out nodes and pad it generously.
    // ReactFlow's `translateExtent` caps how far the viewport can pan; without
    // it the canvas scrolls infinitely into empty space. Pad enough that
    // fitView never clips and that the user has comfortable elbow room to
    // explore each node, but not so much that pan feels unlimited.
    const PAD = 600;
    // Generous default node footprint — bigger than any actual block so the
    // computed bounds err on the side of "too roomy" rather than "edge gets
    // clipped". Matches the level-1 card (280×140) with margin.
    const NODE_W = 320;
    const NODE_H = 180;
    const xs = positions.map((p) => p.x);
    const ys = positions.map((p) => p.y);
    const minX = xs.length ? Math.min(...xs) : 0;
    // When context cards are shown, the bounds extend upward / downward so
    // pan-extent and fitView don't clip them.
    const minY = (ys.length ? Math.min(...ys) : 0) - (prevContextNode ? CONTEXT_Y_OFFSET : 0);
    const maxX = xs.length ? Math.max(...xs) + NODE_W : NODE_W;
    const maxY =
      (ys.length ? Math.max(...ys) : 0) +
      NODE_H +
      (nextContextNode ? CONTEXT_Y_OFFSET : 0);
    const translateExtent: CoordinateExtent = [
      [minX - PAD, minY - PAD],
      [maxX + PAD, maxY + PAD],
    ];

    return { rfNodes, rfEdges, translateExtent };
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

  // At the root view, focus the viewport on the first node (typically the
  // token-embedding) at near-1x zoom. Showing the entire 32-block chain
  // shrunk-to-fit makes everything tiny on load; centering on the input is
  // a much better "where do I start reading" cue. At deeper views (block
  // internals, attention internals, …) the layouts are small enough that
  // fitView'ing the whole thing reads fine, so keep the old behaviour.
  const isRootView = expansionPath.length === 0;
  const firstNodeId = currentView[0]?.id;
  const fitViewOptions = isRootView && firstNodeId
    ? { nodes: [{ id: firstNodeId }], padding: 1.5, maxZoom: 1, minZoom: 0.6 }
    : { padding: 0.25, maxZoom: 1 };

  return (
    <ReactFlow
      key={flowKey}
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={fitViewOptions}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnDrag
      zoomOnScroll
      translateExtent={translateExtent}
    >
      {/* The dotted-grid background is rendered by the canvas wrapper's CSS
          (see App.module.css `.canvasArea`) rather than React Flow's
          <Background> — that keeps the dots at a fixed scale even when the
          viewport zooms out to fit a 32-block model. */}
      <MiniMap
        position="bottom-left"
        pannable
        zoomable
        ariaLabel="Architecture mini map"
        nodeColor="#1a73e8"
        nodeStrokeColor="#ffffff"
        nodeStrokeWidth={1.5}
        maskColor="rgba(229, 231, 235, 0.45)"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
        }}
      />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  );
}
