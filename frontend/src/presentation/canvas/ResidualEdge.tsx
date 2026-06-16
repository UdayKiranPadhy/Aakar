/**
 * Custom edge for residual skip arrows.
 *
 * React Flow's built-in bezier degenerates to a straight vertical line when
 * both endpoints share an x-coordinate (which is exactly what happens with
 * source-right and target-right on a vertically-stacked chain). This edge
 * forces the bezier to bow out to the right with explicit control points,
 * so the skip visibly arcs around the main sub-layer instead of hugging
 * the card edges.
 *
 * The arrowhead, stroke and label come from the edge's `style` / `markerEnd`
 * — kept in `edges.ts` so all styling lives in one place.
 */

import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";

const ARC_OFFSET = 100; // px the curve bows outward; tuned to clear the card

export function ResidualEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  label,
}: EdgeProps) {
  // Control points pushed `ARC_OFFSET` to the right so the bezier arcs out.
  const c1x = sourceX + ARC_OFFSET;
  const c2x = targetX + ARC_OFFSET;
  const path = `M ${sourceX},${sourceY} C ${c1x},${sourceY} ${c2x},${targetY} ${targetX},${targetY}`;

  // Midpoint of the curve for label placement (where the arc is widest to the right).
  const labelX = Math.max(sourceX, targetX) + ARC_OFFSET * 0.7;
  const labelY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: "var(--color-bg)",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--color-accent)",
              pointerEvents: "all",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
