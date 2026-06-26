/** Two models side by side — grouped bars contrasting model A (blue) and model
 * B (red) across a few spec metrics. Bars pop in, staggered. Mirrors the real
 * Compare view's grouped-bar idiom. */

import { motion } from "framer-motion";

import { centerBox, popIn, staggerContainer, useRevealProps } from "../motion";
import * as c from "./colors";
import styles from "./illustrations.module.css";

const BASE = 286; // baseline (bar bottoms)
const BAR_W = 30;
const GAP = 10; // gap between the A and B bar within a group

// Three metric groups; each carries an A (blue) and B (red) height in px.
const GROUPS: ReadonlyArray<{ cx: number; label: string; a: number; b: number }> = [
  { cx: 138, label: "Layers", a: 170, b: 140 },
  { cx: 270, label: "Params", a: 120, b: 200 },
  { cx: 402, label: "Heads", a: 150, b: 110 },
];

// Faint horizontal guide lines behind the bars.
const GRID = [150, 210];

export function CompareDiagram() {
  const reveal = useRevealProps(0.4);
  return (
    <div className={styles.frame}>
      <motion.svg
        className={styles.svg}
        viewBox="0 0 520 340"
        role="img"
        aria-label="Two models compared as grouped bars across layers, parameters and heads"
        variants={staggerContainer(0.1)}
        {...reveal}
      >
        {/* Legend */}
        <motion.g variants={popIn} style={centerBox}>
          <circle cx={186} cy={26} r={6} style={{ fill: c.blue }} />
          <text x={198} y={31} fontSize={13} fontWeight={600} style={{ fill: c.ink }}>
            Model A
          </text>
          <circle cx={290} cy={26} r={6} style={{ fill: c.red }} />
          <text x={302} y={31} fontSize={13} fontWeight={600} style={{ fill: c.ink }}>
            Model B
          </text>
        </motion.g>

        {/* Guide lines + baseline */}
        {GRID.map((y) => (
          <line key={y} x1={48} y1={y} x2={488} y2={y} style={{ stroke: c.hair }} strokeWidth={1} strokeDasharray="3 5" />
        ))}
        <line x1={48} y1={BASE} x2={488} y2={BASE} style={{ stroke: c.hair }} strokeWidth={1.5} />

        {/* Grouped bars */}
        {GROUPS.map((g) => (
          <motion.g key={g.label} variants={popIn} style={centerBox}>
            <rect
              x={g.cx - GAP / 2 - BAR_W}
              y={BASE - g.a}
              width={BAR_W}
              height={g.a}
              rx={7}
              style={{ fill: c.blue }}
            />
            <rect
              x={g.cx + GAP / 2}
              y={BASE - g.b}
              width={BAR_W}
              height={g.b}
              rx={7}
              style={{ fill: c.red }}
            />
            <text x={g.cx} y={BASE + 22} textAnchor="middle" fontSize={12} style={{ fill: c.inkMuted }}>
              {g.label}
            </text>
          </motion.g>
        ))}
      </motion.svg>
    </div>
  );
}
