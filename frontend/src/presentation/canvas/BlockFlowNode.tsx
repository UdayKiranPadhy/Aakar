/**
 * Adapter component used as a React Flow node type.
 *
 * Every handle carries an explicit id. React Flow v12's "default" un-id'd
 * handle matching breaks down as soon as a node has more than one handle of
 * the same type (target or source), so the safe pattern is: id every handle
 * and have every edge specify `sourceHandle` + `targetHandle`. See
 * `edges.ts` for the corresponding `sourceHandle`/`targetHandle` values.
 *
 *   - "in"        — top target, sequential edges arrive here
 *   - "out"       — bottom source, sequential edges depart here
 *   - "right-in"  — right target, residual skip arrives here
 *   - "right-out" — right source, residual skip departs here
 */

import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { Level } from "../../domain/navigation";
import type { Node as SpecNode } from "../../domain/spec";
import { blockRegistry, type NodeRole } from "../blocks/BlockRegistry";

export type BlockFlowData = {
  specNode: SpecNode;
  level: Level;
  isSelected: boolean;
  role?: NodeRole;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
};

const HIDDEN_HANDLE_STYLE = {
  background: "transparent",
  border: "none",
  width: 1,
  height: 1,
};

export function BlockFlowNode({ data }: NodeProps) {
  const d = data as BlockFlowData;
  const Component = blockRegistry.resolve(d.specNode.type);
  return (
    <>
      <Handle id="in" type="target" position={Position.Top} style={HIDDEN_HANDLE_STYLE} />
      <Handle
        id="right-in"
        type="target"
        position={Position.Right}
        style={HIDDEN_HANDLE_STYLE}
      />
      <Handle
        id="right-out"
        type="source"
        position={Position.Right}
        style={HIDDEN_HANDLE_STYLE}
      />
      <Component
        node={d.specNode}
        level={d.level}
        selected={d.isSelected}
        role={d.role}
        onSelect={d.onSelect}
        onExpand={d.onExpand}
      />
      <Handle id="out" type="source" position={Position.Bottom} style={HIDDEN_HANDLE_STYLE} />
    </>
  );
}
