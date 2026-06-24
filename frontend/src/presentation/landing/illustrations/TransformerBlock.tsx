/**
 * A transformer decoder block: Attention and Feed-Forward sub-layers on a
 * residual spine, each followed by a "+" add node fed by a bypass connection.
 * The recognizable "attention is all you need" block, in bold Google colours.
 * Static; colours via the `style` prop (see colors.ts).
 */

import * as c from "./colors";
import styles from "./illustrations.module.css";

type BlockProps = { y: number; label: string; fill: string; textFill?: string };

const BX = 64;
const BW = 112;
const BH = 38;

function Block({ y, label, fill, textFill = c.white }: BlockProps) {
  return (
    <g>
      <rect x={BX} y={y} width={BW} height={BH} rx={12} style={{ fill }} />
      <text
        x={BX + BW / 2}
        y={y + BH / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        style={{ fill: textFill }}
      >
        {label}
      </text>
    </g>
  );
}

function Add({ cy }: { cy: number }) {
  return (
    <g>
      <circle cx={120} cy={cy} r={13} style={{ fill: c.white, stroke: c.ink }} strokeWidth={2} />
      <text
        x={120}
        y={cy + 1}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={18}
        fontWeight={600}
        style={{ fill: c.ink }}
      >
        +
      </text>
    </g>
  );
}

export function TransformerBlock() {
  return (
    <div className={styles.artCard}>
      <svg
        className={styles.svg}
        viewBox="0 0 240 180"
        role="img"
        aria-label="A transformer block with attention, feed-forward and residual connections"
      >
        {/* Residual spine running through the block. */}
        <line x1={120} y1={8} x2={120} y2={172} style={{ stroke: c.inkSubtle }} strokeWidth={2} opacity={0.3} />

        {/* Residual bypass arcs (red) feeding each add node. */}
        <path
          d="M64 37 C 38 37, 38 70, 105 70"
          fill="none"
          style={{ stroke: c.red }}
          strokeWidth={2.5}
          markerEnd="url(#tbArrow)"
        />
        <path
          d="M64 111 C 38 111, 38 144, 105 144"
          fill="none"
          style={{ stroke: c.red }}
          strokeWidth={2.5}
          markerEnd="url(#tbArrow)"
        />
        <defs>
          <marker id="tbArrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0 0 L7 3.5 L0 7 Z" style={{ fill: c.red }} />
          </marker>
        </defs>

        <Block y={18} label="Attention" fill={c.blue} />
        <Add cy={70} />
        <Block y={92} label="Feed-Forward" fill={c.green} />
        <Add cy={144} />
      </svg>
    </div>
  );
}
