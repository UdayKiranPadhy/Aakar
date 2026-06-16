/**
 * React Flow canvas host.
 *
 * Computes the current view's nodes via `useNavigation`, runs them through the
 * LayoutRegistry to get (x, y) positions, builds React Flow nodes + edges,
 * and renders them. Selection and expansion callbacks come from useSelection
 * / useNavigation.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type CoordinateExtent,
  type Edge,
  type FitViewOptions,
  type Node as ReactFlowNode,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { findNodeByPath, type Level } from "../../domain/navigation";
import type { Node as SpecNode } from "../../domain/spec";
import { useNavigation } from "../../application/useNavigation";
import { useSelection } from "../../application/useSelection";
import { useResolvedTheme } from "../../application/useTheme";
import { useArchStore } from "../../store/archStore";
import { BlockFlowNode, type BlockFlowData } from "./BlockFlowNode";
import {
  buildContextEdge,
  buildEdges,
  highlightEdgesForSelection,
  inputOutputForSelection,
} from "./edges";
import { buildSemanticFlow, isSyntheticNode, type SemanticFlow } from "./semanticFlow";
import { buildOperationFlow } from "./operationFlow";
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

/**
 * Turn a module's operation-flow into React Flow nodes/edges. The op-flow is a
 * standalone per-module view (no sibling context cards, no selection-driven
 * structure edges) — just the traced computation DAG.
 */
function buildOpFlowGraph(
  flow: SemanticFlow,
  level: Level,
  selectedFlowId: string | null,
  onSelectFlowNode: (node: SpecNode) => void,
) {
  const positionById = new Map(flow.positions.map((p) => [p.id, p] as const));
  const rfNodes: ReactFlowNode[] = flow.nodes.map((node) => {
    const pos = positionById.get(node.id) ?? { x: 0, y: 0 };
    const data: BlockFlowData = {
      specNode: node,
      level,
      isSelected: selectedFlowId === node.id,
      visualTone: flow.tones.get(node.id),
      // Ops are clickable for an explanation, but never drillable.
      onSelect: () => onSelectFlowNode(node),
    };
    return {
      id: node.id,
      type: "block",
      position: { x: pos.x, y: pos.y },
      data: data as unknown as Record<string, unknown>,
      draggable: true,
      selectable: false,
    };
  });

  const xs = flow.positions.map((p) => p.x);
  const ys = flow.positions.map((p) => p.y);
  const PAD = 600;
  const NODE_W = 220;
  const NODE_H = 120;
  const minX = xs.length ? Math.min(...xs) : 0;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxX = (xs.length ? Math.max(...xs) : 0) + NODE_W;
  const maxY = (ys.length ? Math.max(...ys) : 0) + NODE_H;
  const translateExtent: CoordinateExtent = [
    [minX - PAD, minY - PAD],
    [maxX + PAD, maxY + PAD],
  ];

  return {
    rfNodes,
    rfEdges: [...flow.edges],
    translateExtent,
    semanticFitViewOptions: flow.fitViewOptions,
  };
}

export function Canvas() {
  const spec = useArchStore((s) => s.spec);
  const opFlowPath = useArchStore((s) => s.opFlowPath);
  const opHideShapeOps = useArchStore((s) => s.opHideShapeOps);
  const { level, expansionPath, currentView, expandNode } = useNavigation();
  const { selectedId, selectNode, selectedFlowNode, selectFlowNode } = useSelection();
  const selectedFlowId = selectedFlowNode?.id ?? null;

  const { rfNodes, rfEdges, translateExtent, semanticFitViewOptions } = useMemo(() => {
    // Operation-flow mode: render the focused module's forward-pass op DAG. This
    // is checked before the empty-view guard because it works for leaf modules
    // (a Linear, an RMSNorm) that have ops but no children to populate currentView.
    if (spec && opFlowPath && opFlowPath.length > 0) {
      const module = findNodeByPath(spec.graph, opFlowPath);
      const flow = module
        ? buildOperationFlow(module, { hideShapeOps: opHideShapeOps })
        : null;
      if (flow) return buildOpFlowGraph(flow, level, selectedFlowId, selectFlowNode);
    }

    if (currentView.length === 0) {
      return {
        rfNodes: [] as ReactFlowNode[],
        rfEdges: [] as Edge[],
        translateExtent: undefined,
        semanticFitViewOptions: undefined,
      };
    }

    // Determine the parent node's type so we can resolve the right layout.
    const parent =
      spec && expansionPath.length > 0
        ? findNodeByPath(spec.graph, expansionPath)
        : null;
    const parentType = parent?.type ?? null;

    const semantic = buildSemanticFlow(parent, currentView);
    const visualNodes = semantic?.nodes ?? currentView;
    const strategy = layoutRegistry.resolve(parentType ?? "");
    const positions = semantic?.positions ?? strategy(currentView);
    const positionById = new Map(positions.map((p) => [p.id, p]));

    // Build edges first so we can derive input / output neighbours of the
    // selected node — they get the green / amber border colours in the
    // renderer (and the matching edge stroke colours via
    // highlightEdgesForSelection below).
    const rawEdges = [...(semantic?.edges ?? buildEdges(currentView, parentType))];
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
      const firstVisualNode = visualNodes[0];
      if (prev?.has_internals && firstChildPos && firstVisualNode) {
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
        prevContextEdge = buildContextEdge(prevContextNode.id, firstVisualNode.id);
      }

      // Next sibling — anchored to the last node of the current view.
      const next =
        idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
      const lastChildPos = positions[positions.length - 1];
      const lastVisualNode = visualNodes[visualNodes.length - 1];
      if (next?.has_internals && lastChildPos && lastVisualNode) {
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
        nextContextEdge = buildContextEdge(lastVisualNode.id, nextContextNode.id);
      }
    }

    const rfNodes: ReactFlowNode[] = visualNodes.map((node) => {
      const pos = positionById.get(node.id) ?? { x: 0, y: 0 };
      const synthetic = isSyntheticNode(node);
      const role = inputs.has(node.id)
        ? ("input" as const)
        : outputs.has(node.id)
          ? ("output" as const)
          : undefined;
      const data: BlockFlowData = {
        specNode: node,
        level,
        isSelected: synthetic ? selectedFlowId === node.id : selectedId === node.id,
        role,
        visualVariant: semantic?.variants.get(node.id),
        visualTone: semantic?.tones.get(node.id),
        // Synthetic glyphs (Q heads / Scores / …) aren't in the Spec tree, so
        // they go through the flow-node selection channel for click-to-explain;
        // they're never drillable.
        onSelect: synthetic ? () => selectFlowNode(node) : selectNode,
        onExpand: synthetic ? undefined : expandNode,
      };
      return {
        id: node.id,
        type: "block",
        position: { x: pos.x, y: pos.y },
        data: data as unknown as Record<string, unknown>,
        // Block nodes are draggable so the user can rearrange the layout
        // when computed positions feel cramped. CanvasFlow's Reset button
        // restores the layout-strategy positions.
        draggable: true,
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

    return {
      rfNodes,
      rfEdges,
      translateExtent,
      semanticFitViewOptions: semantic?.fitViewOptions,
    };
  }, [
    currentView,
    spec,
    expansionPath,
    level,
    selectedId,
    selectNode,
    expandNode,
    opFlowPath,
    opHideShapeOps,
    selectedFlowId,
    selectFlowNode,
  ]);

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

  // Remount on view change so fitView re-runs cleanly AND user drag-positions
  // reset to the layout-strategy positions. The key encodes the current zoom
  // path; switching levels triggers a fresh fit. In op-flow mode it also encodes
  // the focused module + shape-filter so toggling either refits. CanvasFlow's
  // reset button covers the within-view case (clear overrides + refit).
  const flowKey = opFlowPath
    ? `op/${opFlowPath.join("/")}/${opHideShapeOps ? "lean" : "full"}`
    : expansionPath.length === 0
      ? "root"
      : expansionPath.join("/");

  // At the root view, focus the viewport on the first node (typically the
  // token-embedding) at near-1x zoom. Showing the entire 32-block chain
  // shrunk-to-fit makes everything tiny on load; centering on the input is
  // a much better "where do I start reading" cue. At deeper views (block
  // internals, attention internals, …) the layouts are small enough that
  // fitView'ing the whole thing reads fine, so keep the old behaviour.
  const isRootView = expansionPath.length === 0;
  const firstNodeId = currentView[0]?.id;
  const fitViewOptions: FitViewOptions = semanticFitViewOptions ?? (isRootView && firstNodeId
    ? { nodes: [{ id: firstNodeId }], padding: 1.5, maxZoom: 1, minZoom: 0.6 }
    : { padding: 0.25, maxZoom: 1 });

  return (
    <ReactFlowProvider>
      <CanvasFlow
        key={flowKey}
        baseNodes={rfNodes}
        edges={rfEdges}
        fitViewOptions={fitViewOptions}
        translateExtent={translateExtent}
      />
    </ReactFlowProvider>
  );
}

type CanvasFlowProps = {
  baseNodes: ReactFlowNode[];
  edges: Edge[];
  fitViewOptions: FitViewOptions;
  translateExtent: CoordinateExtent | undefined;
};

// React Flow's MiniMap paints SVG presentation attributes (not CSS), so its
// colours can't be CSS variables — key them off the resolved theme instead.
// Values mirror tokens.css; everything else on the canvas is themed via
// `colorMode` + the edge/node CSS variables.
const MINIMAP_PALETTE = {
  light: { node: "#1a73e8", stroke: "#ffffff", mask: "rgba(229, 231, 235, 0.45)", bg: "#ffffff", border: "#e5e7eb" },
  dark: { node: "#8ab4f8", stroke: "#202124", mask: "rgba(20, 21, 23, 0.55)", bg: "#28292c", border: "#3c4043" },
} as const;

function CanvasFlow({ baseNodes, edges, fitViewOptions, translateExtent }: CanvasFlowProps) {
  const [nodes, setNodes] = useState<ReactFlowNode[]>(() => baseNodes);
  const { fitView } = useReactFlow();
  const theme = useResolvedTheme();
  const miniMap = MINIMAP_PALETTE[theme];

  const spec = useArchStore((s) => s.spec);
  const opFlowPath = useArchStore((s) => s.opFlowPath);
  const opHideShapeOps = useArchStore((s) => s.opHideShapeOps);
  const setOpHideShapeOps = useArchStore((s) => s.setOpHideShapeOps);
  const exitOpFlow = useArchStore((s) => s.exitOpFlow);
  const opModule =
    spec && opFlowPath ? findNodeByPath(spec.graph, opFlowPath) : null;

  useEffect(() => {
    setNodes((currentNodes) => mergeBaseNodeData(baseNodes, currentNodes));
  }, [baseNodes]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const handleReset = useCallback(() => {
    setNodes(baseNodes);
    // Defer until the position reset has rendered so fitView measures the
    // restored layout, not the dragged one.
    requestAnimationFrame(() => fitView(fitViewOptions));
  }, [baseNodes, fitView, fitViewOptions]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      colorMode={theme}
      fitView
      fitViewOptions={fitViewOptions}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={2}
      nodesDraggable
      nodesConnectable={false}
      panOnDrag
      zoomOnScroll
      translateExtent={translateExtent}
    >
      {/* The dotted-grid background is rendered by the canvas wrapper's CSS
          (see App.module.css `.canvasArea`) rather than React Flow's
          <Background> — that keeps the dots at a fixed scale even when the
          viewport zooms out to fit a 32-block model. */}
      {opFlowPath && (
        <Panel position="top-left">
          <div className={styles.opBar}>
            <button
              type="button"
              className={styles.opBack}
              onClick={exitOpFlow}
              title="Back to the structure view"
            >
              ← Structure
            </button>
            <span className={styles.opTitle}>
              <span aria-hidden="true">⚙</span> {opModule?.label ?? "Operations"}
            </span>
            <label className={styles.opToggle}>
              <input
                type="checkbox"
                checked={opHideShapeOps}
                onChange={(event) => setOpHideShapeOps(event.target.checked)}
              />
              Hide shape ops
            </label>
          </div>
        </Panel>
      )}
      <Panel position="top-right">
        <button
          type="button"
          className={styles.resetButton}
          onClick={handleReset}
          aria-label="Reset layout"
          title="Reset node positions and refit the view"
        >
          <span aria-hidden="true">↺</span> Reset layout
        </button>
      </Panel>
      <MiniMap
        position="bottom-left"
        pannable
        zoomable
        ariaLabel="Architecture mini map"
        nodeColor={miniMap.node}
        nodeStrokeColor={miniMap.stroke}
        nodeStrokeWidth={1.5}
        maskColor={miniMap.mask}
        style={{
          backgroundColor: miniMap.bg,
          border: `1px solid ${miniMap.border}`,
          borderRadius: 8,
        }}
      />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  );
}

function mergeBaseNodeData(
  baseNodes: ReactFlowNode[],
  currentNodes: ReactFlowNode[],
): ReactFlowNode[] {
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  return baseNodes.map((baseNode) => {
    const currentNode = currentById.get(baseNode.id);
    if (!currentNode) return baseNode;
    return {
      ...baseNode,
      position: currentNode.position,
      dragging: currentNode.dragging,
      measured: currentNode.measured,
      width: currentNode.width,
      height: currentNode.height,
      selected: currentNode.selected,
    };
  });
}
