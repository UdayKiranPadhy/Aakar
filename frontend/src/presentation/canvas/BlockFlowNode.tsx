/**
 * Adapter component used as a React Flow node type.
 *
 * React Flow's `nodeTypes` map points "block" to this component; it pulls the
 * Aakar SpecNode out of `data` and delegates rendering to the BlockRegistry.
 * Adding handles (target on top, source on bottom) is what lets edges attach.
 */

import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { Level } from "../../domain/navigation";
import type { Node as SpecNode } from "../../domain/spec";
import { blockRegistry } from "../blocks/BlockRegistry";

export type BlockFlowData = {
  specNode: SpecNode;
  level: Level;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
};

// React Flow v12 generic — TS will accept the structural shape.
export function BlockFlowNode({ data }: NodeProps) {
  const d = data as BlockFlowData;
  const Component = blockRegistry.resolve(d.specNode.type);
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <Component
        node={d.specNode}
        level={d.level}
        selected={d.isSelected}
        onSelect={d.onSelect}
        onExpand={d.onExpand}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
    </>
  );
}
